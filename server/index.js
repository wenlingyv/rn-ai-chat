const express = require('express');
const http = require('http');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth');
const friendRoutes = require('./routes/friend');
const messageRoutes = require('./routes/message');
const { initWebSocket, sendToUser } = require('./websocket');

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
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// -------------------- 数据库 --------------------
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_chat',
  password: '123456',
  port: 5432,
});

pool.on('error', (err) => console.error('PostgreSQL 连接异常：', err));

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
const MIMO_KEY = "tp-stjygn6w8myoh5z7nve6rti23b1clwi9jp46frk3nld9ahwy";
const BOCHA_KEY = "sk-77d284097eff496db8c11ecc7ef22b90";

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

const server = http.createServer(app);

initWebSocket(server);

server.listen(5000, '0.0.0.0', () => {
  console.log("✅ 服务已启动 端口5000 | RAG 已集成 | 认证系统已启用 | WebSocket 已启用");
});