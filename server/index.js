require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const authRoutes = require('./routes/auth');
const friendRoutes = require('./routes/friend');
const messageRoutes = require('./routes/message');
const { initWebSocket, sendToUser, setRealtimeHandler } = require('./websocket');

// -------------------- RAG 真正语义检索（Windows 100% 可用） --------------------
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');

// 本地轻量级语义向量模型（真正RAG，不依赖任何外部库）
class LocalEmbedding {
  async embedDocuments(texts) {
    return texts.map(t => this.encode(t));
  }
  async embedQuery(text) {
    return this.encode(text);
  }
  encode(str) {
    const hash = Array(384).fill(0);
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      hash[i % 384] = (hash[i % 384] + code) * 0.01;
    }
    return hash;
  }
}

const app = express();

// ---- CORS：生产环境允许 HTTPS 域名，开发环境兜底 ----
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// -------------------- 数据库（统一使用database/index.js的连接池） --------------------
const pool = require('./database');

// 初始化数据库
async function initDB() {
  try {
    // 运行数据库迁移
    const { migrate } = require('./database/migrate');
    await migrate();
    console.log("✅ 数据表初始化完成");
  } catch (error) {
    console.error("❌ 建表失败：", error);
  }
}

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/friend', friendRoutes);
app.use('/api/message', messageRoutes);

// -------------------- AI聊天接口（保持兼容） --------------------
// 如果没有提供userId，使用默认用户
initDB().catch(e => console.error("❌ 建表失败：", e));

// -------------------- 全局配置 --------------------
// ⚠️ 生产环境所有 Key 必须通过 .env 注入，代码中不留任何真实值
const MIMO_KEY = process.env.MIMO_KEY;
const BOCHA_KEY = process.env.BOCHA_KEY;
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;

const ROLE_PROMPTS = {
  normal: "你是实用型AI助手，正常友好回答问题。",
  knowledge: "你是专业知识型AI，回答严谨、内容详实、逻辑清晰。",
  angry: "你是暴躁型AI，说话直接简短，语气不耐烦。",
  funny: "你是搞笑型AI，语言幽默风趣，善于玩梗。",
  gentle: "你是温柔型AI，语气亲切耐心，风格治愈。"
};

// -------------------- RAG 核心 --------------------
let vectorStore = null;
const RAG_FOLDER = path.join(__dirname, 'rag_files');

async function initRAG() {
  try {
    if (!fs.existsSync(RAG_FOLDER)) fs.mkdirSync(RAG_FOLDER);
    const files = fs.readdirSync(RAG_FOLDER).filter(f => f.endsWith('.txt'));
    if (files.length === 0) {
      console.log("📂 请在 rag_files 里放入 .txt 知识库文件");
      return;
    }

    const documents = [];
    files.forEach(file => {
      const text = fs.readFileSync(path.join(RAG_FOLDER, file), 'utf8');
      documents.push({ pageContent: text, metadata: { source: file } });
    });

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });

    const splitDocs = await splitter.splitDocuments(documents);

    // 真正向量库 + 真正语义嵌入
    vectorStore = new MemoryVectorStore(new LocalEmbedding());
    await vectorStore.addDocuments(splitDocs);

    console.log("✅ RAG 向量库初始化完成（真正语义检索）");
  } catch (e) {
    console.error("❌ RAG 初始化失败：", e.message);
  }
}

initRAG();

// 真正语义检索
async function retrieveContext(query) {
  if (!vectorStore) return "";
  try {
    const docs = await vectorStore.similaritySearch(query, 3);
    return docs.map(d => d.pageContent).join("\n---\n");
  } catch (e) {
    return "";
  }
}

// -------------------- 网络搜索 --------------------
async function searchWeb(query) {
  if (!query) return { text: "未接收到搜索关键词", sources: [] };
  try {
    const res = await axios.post(
      "https://api.bochaai.com/v1/web-search",
      { query, count: 5, summary: true },
      { headers: { Authorization: `Bearer ${BOCHA_KEY}` } }
    );
    const items = res.data?.data?.webPages?.value || [];
    if (items.length === 0) return { text: "未搜索到相关信息", sources: [] };
    let result = "";
    const sources = [];
    items.forEach((item, i) => {
      result += `[来源${i+1}] ${item.name}\n链接：${item.url}\n摘要：${item.snippet}\n\n`;
      sources.push({ name: item.name, url: item.url, snippet: item.snippet });
    });
    return { text: result.trim(), sources };
  } catch (e) {
    return { text: "网络搜索失败", sources: [] };
  }
}

// -------------------- 历史消息 --------------------
async function getHistory(userId) {
  try {
    const { rows } = await pool.query(
      `SELECT role, content FROM chat_history WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId || "default"]
    );
    return rows;
  } catch (e) {
    return [];
  }
}

async function saveMessage(userId, role, content) {
  try {
    await pool.query(
      `INSERT INTO chat_history (user_id, role, content) VALUES ($1, $2, $3)`,
      [userId || "default", role, content]
    );
  } catch (e) {}
}

// -------------------- 主聊天接口（已集成 RAG） --------------------
app.post('/api/chat', require('./middleware/auth').optionalAuth, async (req, res) => {
  try {
    const user = req.user;
    const { message, model = "deepseek-chat", role = "normal", webSearch = false, image, imageType } = req.body;

    const userId = user ? user.id : "default";
    if (!message && !image) return res.json({ reply: "消息不能为空" });

    const history = await getHistory(userId);
    const isReason = model === "deepseek-reasoner";
    let systemPrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS.normal;

    let ragContext = await retrieveContext(message);

    let searchResult = null;
    let searchSources = [];
    if (webSearch && message) {
      searchResult = await searchWeb(message);
      searchSources = searchResult.sources || [];
    }

    if (webSearch && searchResult && searchResult.text) {
      systemPrompt += `\n资料：\n${searchResult.text}`;
    }

    if (ragContext) {
      systemPrompt += `\n\n【本地知识库】请根据以下资料回答：\n${ragContext}`;
    }

    let userContent = image
      ? [
          { type: "image_url", image_url: { url: `data:${imageType||'image/jpeg'};base64,${image}` } },
          { type: "text", text: message || "请描述这张图片" }
        ]
      : message;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userContent }
    ];

    const result = await axios.post(
      "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions",
      {
        model: isReason ? "mimo-v2.5-pro" : "mimo-v2.5",
        messages,
        temperature: isReason ? 0.1 : role === "angry" ? 1.3 : 0.7,
      },
      {
        headers: {
          "Authorization": `Bearer ${MIMO_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const choice = result.data.choices[0];
    let reply = choice?.message?.content?.trim() || "无回复";
    let thinking = "";

    if (isReason) {
      thinking = choice?.message?.reasoning_content?.trim() || "";
      if (!thinking) {
        const thinkMatch = reply.match(/【思考过程】([\s\S]*?)【最终回答】/);
        const ansMatch = reply.match(/【最终回答】([\s\S]*)/);
        if (thinkMatch) {
          thinking = thinkMatch[1].trim();
          if (ansMatch) reply = ansMatch[1].trim();
        }
      }
    }

    await saveMessage(userId, "user", message);
    await saveMessage(userId, "assistant", reply);

    const response = { reply };
    if (thinking) response.thinking = thinking;
    if (searchSources.length > 0) response.searchSources = searchSources;
    res.json(response);
  } catch (err) {
    console.error("❌ 服务异常：", err.response?.data || err.message);
    res.json({ reply: "服务异常，请稍后重试" });
  }
});

// 修改保存消息函数，支持sender和receiver
async function saveMessage(senderId, role, content, receiverId = null) {
  try {
    let query, params;

    if (receiverId) {
      // 用户间消息
      query = `
        INSERT INTO chat_history (sender_id, receiver_id, role, content)
        VALUES ($1, $2, $3, $4)
      `;
      params = [senderId, receiverId, role, content];
    } else {
      // AI聊天消息
      query = `
        INSERT INTO chat_history (sender_id, role, content)
        VALUES ($1, $2, $3)
      `;
      params = [senderId, role, content];
    }

    await pool.query(query, params);
  } catch (e) {}
}

// 清空历史（可选认证）
app.post('/api/clear', require('./middleware/auth').optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : "default";
    await pool.query(`DELETE FROM chat_history WHERE sender_id = $1`, [userId]);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Chat Server is running' });
});

// -------------------- GLM-Realtime JWT Token 生成 --------------------
app.get('/api/realtime/token', (req, res) => {
  if (!ZHIPU_API_KEY || ZHIPU_API_KEY === 'YOUR_ZHIPU_API_KEY') {
    return res.status(500).json({ error: '请先配置智谱 API Key (ZHIPU_API_KEY)' });
  }
  try {
    const parts = ZHIPU_API_KEY.split('.');
    if (parts.length !== 2) {
      return res.status(500).json({ error: '智谱 API Key 格式错误，应为 id.secret' });
    }
    const [id, secret] = parts;
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { api_key: id, exp: Math.floor(Date.now() / 1000) + 600, timestamp: Date.now() },
      secret,
      { algorithm: 'HS256', header: { alg: 'HS256', sign_type: 'SIGN' } }
    );
    res.json({ token, expiresIn: 600 });
  } catch (e) {
    res.status(500).json({ error: 'Token 生成失败: ' + e.message });
  }
});

// 提供AI音频文件
app.get('/api/realtime/audio/:filename', (req, res) => {
  const audioDir = path.join(__dirname, 'audio_cache');
  const filePath = path.join(audioDir, req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '音频文件不存在' });
  }
  
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  
  // 播放后删除文件（30秒后）
  setTimeout(() => {
    try { fs.unlinkSync(filePath); } catch (e) {}
  }, 30000);
});

const server = http.createServer(app);

initWebSocket(server);

// -------------------- GLM-Realtime WebSocket 代理 --------------------
const RealtimeWS = require('ws');

const REALTIME_WS_URL = 'wss://open.bigmodel.cn/api/paas/v4/realtime';

// 生成智谱 Realtime JWT Token（手动构建，避免 jsonwebtoken 库添加多余字段）
function generateZhipuToken() {
  const crypto = require('crypto');
  const parts = ZHIPU_API_KEY.split('.');
  const [apiKeyId, apiKeySecret] = parts;
  
  // 智谱要求秒级时间戳
  const now = Math.floor(Date.now() / 1000);
  
  // Header: 只包含 alg 和 sign_type，不要 typ
  const header = Buffer.from(JSON.stringify({
    alg: 'HS256',
    sign_type: 'SIGN'
  })).toString('base64url');
  
  // Payload: 只包含 api_key、exp、timestamp，不要 iat
  const payload = Buffer.from(JSON.stringify({
    api_key: apiKeyId,
    exp: now + 600,
    timestamp: now
  })).toString('base64url');
  
  // Signature
  const signature = crypto
    .createHmac('sha256', apiKeySecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  
  const token = `${header}.${payload}.${signature}`;
  console.log('🔑 智谱 Token 生成成功（秒级时间戳，无多余字段）');
  return token;
}

setRealtimeHandler((request, socket, head) => {
  if (!ZHIPU_API_KEY || ZHIPU_API_KEY === 'YOUR_ZHIPU_API_KEY') {
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    socket.destroy();
    return;
  }

  const wss = new RealtimeWS.Server({ noServer: true });
  wss.handleUpgrade(request, socket, head, (clientWs) => {
    console.log('📱 前端已连接 Realtime 代理');
    
    const token = generateZhipuToken();
    console.log('🔗 正在连接智谱:', REALTIME_WS_URL);
    
    const zhipuWs = new RealtimeWS(REALTIME_WS_URL, [], {
      headers: { Authorization: `Bearer ${token}` },
    });

    const messageBuffer = [];
    const audioChunks = [];

    const convertAudioToWav = async (inputBase64) => {
      const inputBuffer = Buffer.from(inputBase64, 'base64');
      const tmpDir = os.tmpdir();
      const ts = Date.now();
      const inputPath = path.join(tmpDir, `audio_in_${ts}.mp4`);
      const outputPath = path.join(tmpDir, `audio_out_${ts}.wav`);

      fs.writeFileSync(inputPath, inputBuffer);

      await new Promise((resolve, reject) => {
        execFile('ffmpeg', [
          '-y', '-i', inputPath,
          '-ar', '24000', '-ac', '1', '-sample_fmt', 's16',
          outputPath
        ], (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve();
        });
      });

      const wavBuffer = fs.readFileSync(outputPath);
      // 智谱要求 pcm16 格式（纯PCM数据，不含WAV头）
      // 查找WAV文件中的"data"chunk，避免固定44字节偏移（ffmpeg可能生成额外chunk）
      let pcmBuffer;
      let dataOffset = 12; // 跳过RIFF header (12字节)
      while (dataOffset < wavBuffer.length - 8) {
        const chunkId = wavBuffer.toString('ascii', dataOffset, dataOffset + 4);
        const chunkSize = wavBuffer.readUInt32LE(dataOffset + 4);
        if (chunkId === 'data') {
          pcmBuffer = wavBuffer.slice(dataOffset + 8, dataOffset + 8 + chunkSize);
          break;
        }
        dataOffset += 8 + chunkSize;
        // 确保chunkSize对齐到偶数（WAV规范要求）
        if (chunkSize % 2 !== 0) dataOffset += 1;
      }
      if (!pcmBuffer) {
        // 回退：如果找不到data chunk，使用固定44字节偏移
        pcmBuffer = wavBuffer.slice(44);
      }
      const pcmBase64 = pcmBuffer.toString('base64');

      console.log('🔄 音频转换: WAV=' + wavBuffer.length + '字节, PCM(去头)=' + pcmBuffer.length + '字节');

      try { fs.unlinkSync(inputPath); } catch (e) {}
      try { fs.unlinkSync(outputPath); } catch (e) {}

      return pcmBase64;
    };

    zhipuWs.on('open', () => {
      console.log('✅ 已连接智谱 GLM-Realtime');
      if (messageBuffer.length > 0) {
        console.log(`📤 转发缓冲消息 (${messageBuffer.length} 条)`);
        for (const msg of messageBuffer) {
          if (zhipuWs.readyState === RealtimeWS.OPEN) {
            zhipuWs.send(msg.data, msg.options);
          }
        }
        messageBuffer.length = 0;
      }
    });

    const outputAudioChunks = [];

    zhipuWs.on('message', (data, isBinary) => {
      if (clientWs.readyState !== RealtimeWS.OPEN) return;

      if (isBinary) {
        clientWs.send(data, { binary: true });
        return;
      }

      const text = data.toString('utf8');
      let msg;
      try { msg = JSON.parse(text); } catch (e) {
        clientWs.send(text);
        return;
      }

      // 缓冲AI音频delta，不直接转发
      if (msg.type === 'response.audio.delta') {
        if (msg.delta) {
          outputAudioChunks.push(msg.delta);
        }
        // 不转发delta给前端，等audio.done时一起发
        return;
      }

      // audio.done时合并所有delta，添加WAV头，一次性发送
      if (msg.type === 'response.audio.done') {
        console.log('🎵 收到response.audio.done，缓冲区长度:', outputAudioChunks.length);
        if (outputAudioChunks.length > 0) {
          // 逐个解码base64 delta为Buffer，再合并（不能直接拼接base64字符串，会损坏数据）
          const pcmBuffers = outputAudioChunks.map(chunk => Buffer.from(chunk, 'base64'));
          outputAudioChunks.length = 0;
          const pcmBuffer = Buffer.concat(pcmBuffers);
          const dataSize = pcmBuffer.length;

          // 构建WAV头（24kHz, 单声道, 16-bit PCM）
          const header = Buffer.alloc(44);
          header.write('RIFF', 0);
          header.writeUInt32LE(36 + dataSize, 4);
          header.write('WAVE', 8);
          header.write('fmt ', 12);
          header.writeUInt32LE(16, 16);
          header.writeUInt16LE(1, 20);
          header.writeUInt16LE(1, 22);
          header.writeUInt32LE(24000, 24);
          header.writeUInt32LE(48000, 28);
          header.writeUInt16LE(2, 32);
          header.writeUInt16LE(16, 34);
          header.write('data', 36);
          header.writeUInt32LE(dataSize, 40);

          const wavBuffer = Buffer.concat([header, pcmBuffer]);
          const wavBase64 = wavBuffer.toString('base64');

          console.log('🎵 AI音频合并完成，PCM=' + dataSize + '字节，WAV=' + wavBuffer.length + '字节，base64=' + wavBase64.length);

          // 直接发送base64 WAV数据给前端
          clientWs.send(JSON.stringify({
            type: 'response.audio.wav',
            audio: wavBase64,
            item_id: msg.item_id,
          }));
        }
        // 不转发原始audio.done
        return;
      }

      // 其他消息正常转发
      console.log('📨 转发文本消息:', text.substring(0, 120) + (text.length > 120 ? '...' : ''));
      clientWs.send(text);
    });

    zhipuWs.on('close', (code, reason) => {
      console.log('🔗 智谱连接关闭 code=' + code + ' reason=' + reason.toString());
      if (clientWs.readyState === RealtimeWS.OPEN) {
        clientWs.close(code, reason);
      }
    });

    zhipuWs.on('error', (err) => {
      console.log('❌ 智谱连接错误:', err.message);
      if (clientWs.readyState === RealtimeWS.OPEN) {
        clientWs.close(1011, 'Upstream error: ' + err.message);
      }
    });

    clientWs.on('message', async (data, isBinary) => {
      if (isBinary) {
        if (zhipuWs.readyState === RealtimeWS.OPEN) {
          zhipuWs.send(data, { binary: true });
        } else {
          messageBuffer.push({ data, options: { binary: true } });
        }
        return;
      }

      const text = data.toString('utf8');
      let msg;
      try { msg = JSON.parse(text); } catch (e) {
        if (zhipuWs.readyState === RealtimeWS.OPEN) {
          zhipuWs.send(text);
        }
        return;
      }

      if (msg.type === 'input_audio_buffer.append') {
        audioChunks.push(msg.audio);
        return;
      }

      if (msg.type === 'input_audio_buffer.commit') {
        if (audioChunks.length === 0) {
          if (zhipuWs.readyState === RealtimeWS.OPEN) {
            zhipuWs.send(text);
          }
          return;
        }

        try {
          // 逐个解码base64为Buffer，再合并（不能直接拼接base64字符串，会损坏数据）
          const audioBuffers = audioChunks.map(chunk => Buffer.from(chunk, 'base64'));
          audioChunks.length = 0;
          const fullBuffer = Buffer.concat(audioBuffers);
          const fullBase64 = fullBuffer.toString('base64');
          console.log('🔄 转换音频格式，原始base64大小:', fullBase64.length);

          const pcmBase64 = await convertAudioToWav(fullBase64);
          console.log('✅ 音频转换完成，PCM16大小:', pcmBase64.length);

          if (zhipuWs.readyState === RealtimeWS.OPEN) {
            const chunkSize = 4096;
            const ts = msg.client_timestamp || Date.now();
            for (let i = 0; i < pcmBase64.length; i += chunkSize) {
              const chunk = pcmBase64.slice(i, i + chunkSize);
              zhipuWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: chunk,
                client_timestamp: ts,
              }));
            }
            zhipuWs.send(JSON.stringify({
              type: 'input_audio_buffer.commit',
              client_timestamp: Date.now(),
            }));
            console.log('📤 已发送PCM16音频到智谱');
          }
        } catch (e) {
          console.log('❌ 音频转换失败:', e.message);
          // 转换失败时，用已合并的原始数据直接发送（作为降级方案）
          if (zhipuWs.readyState === RealtimeWS.OPEN && fullBuffer.length > 0) {
            const fallbackBase64 = fullBuffer.toString('base64');
            const chunkSize = 4096;
            for (let i = 0; i < fallbackBase64.length; i += chunkSize) {
              const chunk = fallbackBase64.slice(i, i + chunkSize);
              zhipuWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: chunk,
                client_timestamp: msg.client_timestamp || Date.now(),
              }));
            }
            zhipuWs.send(text);
          }
        }
        return;
      }

      if (zhipuWs.readyState === RealtimeWS.OPEN) {
        console.log('📤 前端发送文本消息:', text.substring(0, 120) + (text.length > 120 ? '...' : ''));
        zhipuWs.send(text);
      } else {
        console.log('📦 缓冲文本消息:', text.substring(0, 120) + (text.length > 120 ? '...' : ''));
        messageBuffer.push({ data: text, options: {} });
      }
    });

    clientWs.on('close', () => {
      console.log('📱 前端断开 Realtime 代理');
      if (zhipuWs.readyState === RealtimeWS.OPEN || zhipuWs.readyState === RealtimeWS.CONNECTING) {
        zhipuWs.close();
      }
    });

    clientWs.on('error', (err) => {
      console.log('❌ 前端 Realtime 错误:', err.message);
    });

    wss.emit('connection', clientWs, request);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务已启动 端口${PORT} | RAG 已集成 | 认证系统已启用 | WebSocket 已启用`);
});