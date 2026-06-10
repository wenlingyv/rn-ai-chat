# MeetU 社交App 技术文档

> 版本：v1.0 | 更新日期：2025-06-05

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈总览](#2-技术栈总览)
3. [系统架构](#3-系统架构)
4. [认证系统 — 双Token + 单点登录](#4-认证系统--双token--单点登录)
5. [AI对话系统 — LangChain + SSE](#5-ai对话系统--langchain--sse)
6. [RAG检索增强生成](#6-rag检索增强生成)
7. [联网搜索 + 多模态理解](#7-联网搜索--多模态理解)
8. [语音对话 — 智谱GLM-Realtime代理](#8-语音对话--智谱glm-realtime代理)
9. [WebSocket实时通信](#9-websocket实时通信)
10. [3D动画 — Three.js跨平台实现](#10-3d动画--threejs跨平台实现)
11. [国际化 i18n](#11-国际化-i18n)
12. [主题换肤](#12-主题换肤)
13. [数据库设计](#13-数据库设计)
14. [Docker容器化部署](#14-docker容器化部署)
15. [企业级优化](#15-企业级优化)
16. [页面渲染流程](#16-页面渲染流程)
17. [技术亮点汇总](#17-技术亮点汇总)

---

## 1. 项目概述

MeetU 是一款基于 React Native + Expo 的跨平台 AI 社交应用，核心功能包括：

- **社交聊天**：好友搜索/添加、私聊消息、实时在线状态
- **AI对话**：多角色人格切换、深度思考、联网搜索、图片识别、RAG知识库
- **语音对话**：基于智谱GLM-Realtime的实时语音交互
- **3D动画**：Three.js 3D立体爱心登录过渡动画
- **主题换肤**：6色 × 亮暗模式 = 12种外观
- **国际化**：中英文双语切换

---

## 2. 技术栈总览

### 前端

| 技术 | 版本/说明 | 用途 |
|------|----------|------|
| React Native | Expo Go | 跨平台框架 |
| @react-navigation | 6.x | 底部Tab + Stack导航 |
| react-native-webview | - | Three.js/高德地图容器 |
| expo-image-picker | - | 图片选择 |
| expo-av | - | 语音录制/播放 |
| expo-file-system | - | 文件读写（base64转换） |
| i18next + react-i18next | - | 国际化 |
| AsyncStorage | - | 本地持久化 |

### 后端

| 技术 | 用途 |
|------|------|
| Express | HTTP服务 |
| ws | 原生WebSocket（非Socket.IO） |
| @langchain/openai | LangChain ChatOpenAI |
| @langchain/community | MemoryVectorStore |
| langchain | RecursiveCharacterTextSplitter |
| jsonwebtoken | JWT生成/验证 |
| bcrypt | 密码哈希 |
| ffmpeg | 音频格式转换 |
| PostgreSQL | 生产数据库 |

### AI模型

| 模型 | 用途 | API格式 |
|------|------|---------|
| mimo-v2.5 | 普通AI对话 | OpenAI兼容 |
| mimo-v2.5-pro | 深度思考模式 | OpenAI兼容 |
| GLM-Realtime | 实时语音对话 | 智谱WebSocket |

---

## 3. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端 (RN + Expo)                    │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │AuthContext│ │ThemeCtx  │ │LangCtx   │ │WebSocketCtx  │   │
│  │双Token    │ │6色×亮暗  │ │i18n      │ │心跳+重连     │   │
│  └─────┬────┘ └──────────┘ └──────────┘ └──────┬───────┘   │
│        │                                         │           │
│  ┌─────▼─────────────────────────────────────────▼───────┐  │
│  │              NavigationContainer                       │  │
│  │  Login → Transition(3D爱心) → MainTabs                │  │
│  │  [消息] [圈子] [AI聊天] [我的]                          │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / WebSocket
┌───────────────────────────▼─────────────────────────────────┐
│                     服务端 (Express + ws)                     │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │/api/auth │ │/api/chat │ │/api/real │ │WebSocket /ws │   │
│  │双Token   │ │SSE流式   │ │time代理  │ │即时通讯      │   │
│  └─────┬────┘ └─────┬────┘ └─────┬────┘ └──────┬───────┘   │
│        │            │            │              │           │
│  ┌─────▼────────────▼────────────▼──────────────▼───────┐  │
│  │              中间件层                                   │  │
│  │  authenticateToken | 速率限制 | 输入校验 | Token截断   │  │
│  └─────────────────────────┬─────────────────────────────┘  │
│                             │                                │
│  ┌──────────────────────────▼─────────────────────────────┐ │
│  │              外部服务                                    │ │
│  │  MIMO API | 智谱GLM-Realtime | 博查搜索 | ffmpeg       │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   PostgreSQL 16                              │
│  users | user_sessions | chat_history | friendships         │
│  private_messages | verification_codes                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 认证系统 — 双Token + 单点登录

### 4.1 架构设计

```
┌──────────────┐                    ┌──────────────┐
│   客户端      │                    │   服务端      │
│              │                    │              │
│ accessToken  │── Authorization ──→│ authenticate │
│ (15min)      │    Bearer Token    │ Token中间件   │
│              │                    │              │
│ refreshToken │── POST /refresh ──→│ 验证hash     │
│ (7d)         │                    │ 撤销旧session │
│              │←── 新双Token ──────│ 生成新session │
└──────────────┘                    └──────────────┘
```

### 4.2 Token生成与验证

**文件**：`server/utils/jwt.js`

```javascript
// accessToken：15分钟过期，携带userId + sessionId
const accessToken = jwt.sign(
  { userId, sessionId },
  process.env.ACCESS_TOKEN_SECRET,
  { expiresIn: '15m' }
);

// refreshToken：7天过期，携带userId + sessionId
const refreshToken = jwt.sign(
  { userId, sessionId },
  process.env.REFRESH_TOKEN_SECRET,
  { expiresIn: '7d' }
);
```

### 4.3 Refresh Token 不存明文 — HMAC-SHA256

**文件**：`server/utils/jwt.js`

```javascript
// 存储：随机salt + HMAC-SHA256哈希
const generateRefreshTokenHash = (token) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(token).digest('hex');
  return { salt, hash };  // 数据库存 salt + hash，不存 token 明文
};

// 验证：用存的salt重新算一遍，比对hash
const verifyRefreshTokenHash = (token, storedHash, storedSalt) => {
  const hash = crypto.createHmac('sha256', storedSalt).update(token).digest('hex');
  return hash === storedHash;
};
```

**安全收益**：数据库被拖库后，攻击者拿到的是 hash + salt，无法反推出 refreshToken。

### 4.4 Token轮转 — 每次刷新生成全新sessionId

**文件**：`server/services/authService.js`

```javascript
const refreshAccessToken = async (oldRefreshToken) => {
  // 1. 验证旧refreshToken的hash
  // 2. 撤销旧session
  await client.query('UPDATE user_sessions SET is_revoked = true WHERE id = $1', [session.id]);
  // 3. 生成全新sessionId + 全新双Token
  const newSessionId = `session_${decoded.userId}_${Date.now()}`;
  const newAccessToken = generateAccessToken({ userId, sessionId: newSessionId });
  const newRefreshToken = generateRefreshToken({ userId, sessionId: newSessionId });
  // 4. 存新session
  await client.query('INSERT INTO user_sessions ...', [...]);
};
```

**安全收益**：旧refreshToken用一次就作废，防止重放攻击。

### 4.5 单点登录 — 登录时撤销所有旧session

**文件**：`server/services/authService.js`

```javascript
const loginUser = async (username, password) => {
  // 密码验证通过后，撤销该用户所有旧session
  await client.query(
    'UPDATE user_sessions SET is_revoked = true WHERE user_id = $1 AND is_revoked = false',
    [user.id]
  );
  // 然后创建新session
};
```

**效果**：新设备登录后，旧设备15分钟内accessToken过期，refreshToken已撤销，无法续期，被踢下线。

### 4.6 前端401无感刷新

**文件**：`client/AuthContext.js`

```javascript
const authFetch = useCallback(async (url, options = {}) => {
  let response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    const newAccessToken = await doRefreshToken();  // 自动刷新
    headers['Authorization'] = `Bearer ${newAccessToken}`;
    response = await fetch(url, { ...options, headers });  // 重试
  }
  return response;
}, [doRefreshToken]);
```

### 4.7 并发刷新去重

**文件**：`client/AuthContext.js`

```javascript
const doRefreshToken = useCallback(async () => {
  if (isRefreshing.current && refreshPromise.current) {
    return refreshPromise.current;  // 多个401共享同一个Promise
  }
  isRefreshing.current = true;
  refreshPromise.current = (async () => { /* 刷新逻辑 */ })();
  return refreshPromise.current;
}, []);
```

**效果**：多个请求同时401时，只有第一个真正刷新，其余共享同一个Promise。

### 4.8 数据库事务 + 行锁

**文件**：`server/services/authService.js`

```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const userResult = await client.query(
    'SELECT id, username, password FROM users WHERE username = $1 FOR UPDATE',  // 行锁
    [username]
  );
  // ... 业务逻辑
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

**效果**：`FOR UPDATE` 行锁防止并发登录时的竞态条件。

---

## 5. AI对话系统 — LangChain + SSE

### 5.1 架构

```
用户输入 → 后端构造LangChain消息 → ChatOpenAI.stream() → SSE逐token推送 → 前端ReadableStream接收
```

### 5.2 后端 — LangChain + SSE流式输出

**文件**：`server/index.js`

#### ChatOpenAI实例

```javascript
const chatModel = new ChatOpenAI({
  modelName: isReason ? "mimo-v2.5-pro" : "mimo-v2.5",
  temperature: isReason ? 0.1 : role === "angry" ? 1.3 : 0.7,
  streaming: true,
  openAIApiKey: MIMO_KEY,
  configuration: { baseURL: "https://token-plan-sgp.xiaomimimo.com/v1" },
});
```

#### LangChain消息构建

```javascript
const lcMessages = [new SystemMessage(systemPrompt)];
for (const h of history) {
  if (h.role === 'user') lcMessages.push(new HumanMessage(h.content));
  else if (h.role === 'assistant') lcMessages.push(new AIMessage(h.content));
}
// 当前消息（支持多模态）
if (image) {
  lcMessages.push(new HumanMessage({
    content: [
      { type: "image_url", image_url: { url: `data:${imageType};base64,${image}` } },
      { type: "text", text: message || "请描述这张图片" },
    ],
  }));
} else {
  lcMessages.push(new HumanMessage(message));
}
```

#### SSE流式输出

```javascript
res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no');

const stream = await chatModel.stream(lcMessages);
for await (const chunk of stream) {
  if (res.writableEnded || res.destroyed) break;

  // 深度思考内容
  if (chunk.additional_kwargs?.reasoning_content) {
    res.write(`data: ${JSON.stringify({
      type: "thinking",
      content: chunk.additional_kwargs.reasoning_content
    })}\n\n`);
  }

  // 普通token
  if (chunk.content) {
    res.write(`data: ${JSON.stringify({ type: "token", content: chunk.content })}\n\n`);
  }
}
res.write(`data: ${JSON.stringify({ type: "done", reply: fullReply })}\n\n`);
res.end();
```

**SSE事件类型**：

| 事件类型 | 说明 |
|---------|------|
| `token` | AI回复的每个token |
| `thinking` | 深度思考过程 |
| `sources` | 联网搜索来源 |
| `done` | 生成完成，包含完整回复 |
| `error` | 错误信息 |

### 5.3 前端 — SSE流式接收

**文件**：`client/screens/AIChatScreen.js`

```javascript
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';  // 半包处理：最后一个不完整的行放回buffer

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const event = JSON.parse(line.slice(6));
    switch (event.type) {
      case 'token':     // 逐token追加到消息
      case 'thinking':  // 思考过程追加
      case 'sources':   // 搜索来源
      case 'done':      // 生成完成
    }
  }
}
```

### 5.4 SSE半包处理

**核心**：`buffer + split('\n') + pop()`

```
chunk1: "data: {\"type\":\"to"       ← 不完整
  → buffer = "data: {\"type\":\"to"
  → lines = [], 不处理

chunk2: "ken\",\"content\":\"你好\"}\n\n"  ← 拼接后完整
  → buffer = "data: {\"type\":\"token\",\"content\":\"你好\"}\n\n"
  → lines = ["data: {...}"], 解析成功
```

`TextDecoder stream:true` 解决UTF-8跨chunk的多字节字符问题。

### 5.5 流式中断 — AbortController

```javascript
const abortController = new AbortController();
const response = await fetch(API_URL, { signal: abortController.signal });

// 停止生成
const stopGeneration = () => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  setLoading(false);
};
```

### 5.6 多角色人格切换

**5种角色**，每种角色有不同的systemPrompt和temperature：

| 角色 | temperature | 风格 |
|------|------------|------|
| normal | 0.7 | 正常友好 |
| knowledge | 0.5 | 知识渊博 |
| angry | 1.3 | 暴躁毒舌 |
| funny | 0.9 | 搞笑幽默 |
| gentle | 0.6 | 温柔体贴 |

### 5.7 深度思考模式

- 普通模式：`mimo-v2.5`，temperature 0.7
- 深度思考：`mimo-v2.5-pro`，temperature 0.1
- 思考过程通过 `chunk.additional_kwargs.reasoning_content` 流式推送

---

## 6. RAG检索增强生成

### 6.1 流程

```
rag_files/*.txt → 文本分割(500字/块, 100字重叠) → 向量化(384维) → MemoryVectorStore
                                                                          │
用户提问 → 向量化 → 余弦相似度匹配 → Top 3 → 注入systemPrompt → AI基于知识库回答
```

### 6.2 本地嵌入模型

**文件**：`server/index.js`

```javascript
class LocalEmbedding {
  encode(str) {
    const hash = Array(384).fill(0);
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      hash[i % 384] = (hash[i % 384] + code) * 0.01;
    }
    return hash;
  }
  async embedDocuments(texts) { return texts.map(t => this.encode(t)); }
  async embedQuery(text) { return this.encode(text); }
}
```

**特点**：零外部依赖、零API成本、Windows兼容、384维向量。

### 6.3 文本分割

```javascript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,       // 每块最多500字
  chunkOverlap: 100,    // 相邻块重叠100字
});
```

**重叠的意义**：防止关键信息恰好在分割边界处被切断。

### 6.4 语义检索 + Prompt注入

```javascript
async function retrieveContext(query) {
  if (!vectorStore) return "";
  const docs = await vectorStore.similaritySearch(query, 3);  // Top 3
  return docs.map(d => d.pageContent).join("\n---\n");
}

// 注入systemPrompt
if (ragContext) {
  systemPrompt += `\n\n【本地知识库】请根据以下资料回答：\n${ragContext}`;
}
```

---

## 7. 联网搜索 + 多模态理解

### 7.1 联网搜索

**文件**：`server/index.js`

调用博查API搜索，结果注入systemPrompt：

```javascript
async function searchWeb(query) {
  const response = await fetch(`https://api.bochaai.com/v1/web-search`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${BOCHA_KEY}` },
    body: JSON.stringify({ query, count: 5 }),
  });
  return data.data.webPages.value.map(item => ({
    title: item.name, url: item.url, snippet: item.snippet
  }));
}

// 注入systemPrompt
if (searchSources.length > 0) {
  systemPrompt += `\n\n【联网搜索结果】\n${searchText}`;
  // 同时通过SSE推送搜索来源
  res.write(`data: ${JSON.stringify({ type: "sources", data: searchSources })}\n\n`);
}
```

### 7.2 多模态理解

前端选图 → base64编码 → 后端构造LangChain多模态消息：

```javascript
new HumanMessage({
  content: [
    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
    { type: "text", text: message || "请描述这张图片" },
  ],
})
```

MIMO模型兼容OpenAI多模态格式，同时处理图片和文字。

---

## 8. 语音对话 — 智谱GLM-Realtime代理

### 8.1 为什么需要代理

| 问题 | 原因 | 代理解决 |
|------|------|---------|
| JWT认证 | API Key不能暴露给前端 | 后端生成Token连接智谱 |
| 音频格式转换 | AAC→PCM16需要ffmpeg | 后端调ffmpeg转换 |
| WAV头拼接 | 智谱返回PCM裸数据 | 后端合并delta + 加WAV头 |

### 8.2 代理架构

```
前端App ←──WebSocket──→ 后端代理 ←──WebSocket──→ 智谱GLM-Realtime
   │                      │                        │
   │ ①发送AAC音频          │ ②ffmpeg转PCM16          │ ③接收PCM
   │ ⑥播放WAV音频          │ ⑤加WAV头               │ ④返回PCM
```

### 8.3 JWT Token生成

**文件**：`server/index.js`

```javascript
function generateZhipuToken() {
  const [apiKeyId, apiKeySecret] = ZHIPU_API_KEY.split('.');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', sign_type: 'SIGN' }))
    .toString('base64url');
  const payload = Buffer.from(JSON.stringify({ api_key: apiKeyId, exp: now + 600, timestamp: now }))
    .toString('base64url');
  const signature = crypto.createHmac('sha256', apiKeySecret)
    .update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}
```

### 8.4 音频格式转换

```javascript
// AAC → PCM16（ffmpeg）
await execFile('ffmpeg', [
  '-y', '-i', inputPath,
  '-ar', '24000',    // 24kHz采样率
  '-ac', '1',        // 单声道
  '-sample_fmt', 's16',  // 16-bit PCM
  outputPath
]);

// 从WAV文件中提取纯PCM数据（去掉WAV头）
```

### 8.5 AI音频合并 + WAV头

```javascript
// 合并所有audio delta
const pcmBuffer = Buffer.concat(outputAudioChunks.map(c => Buffer.from(c, 'base64')));

// 构建44字节WAV头（24kHz, 单声道, 16-bit）
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + dataSize, 4);
header.write('WAVE', 8);
// ... fmt chunk ...
header.write('data', 36);
header.writeUInt32LE(dataSize, 40);

const wavBuffer = Buffer.concat([header, pcmBuffer]);
```

---

## 9. WebSocket实时通信

### 9.1 原生WebSocket（非Socket.IO）

**后端**：`ws`库 | **前端**：浏览器原生 `WebSocket` API

### 9.2 连接认证

```javascript
// 前端：URL参数传Token
const ws = new WebSocket(`${WS_URL}?token=${accessToken}`);

// 后端：升级握手时验证
const token = params.get('token');
decoded = verifyAccessToken(token);
```

### 9.3 心跳机制

```javascript
// 前端：每45秒发送ping
setInterval(() => ws.send(JSON.stringify({ type: 'ping' })), 45000);

// 后端：回复pong
if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
```

### 9.4 自动重连

```javascript
ws.onclose = () => {
  if (isAuthenticated && !intentionalClose) {
    setTimeout(connect, 3000);  // 3秒后重连
  }
};
```

### 9.5 消息类型

| 类型 | 方向 | 说明 |
|------|------|------|
| `ping/pong` | 双向 | 心跳 |
| `chat` | 客户端→服务端 | 发送私聊消息 |
| `chat_sent` | 服务端→客户端 | 消息发送确认 |
| `friend_request` | 双向 | 好友申请 |
| `friend_accepted` | 双向 | 好友通过 |
| `read` | 双向 | 已读回执 |

### 9.6 在线用户管理

```javascript
// Map<userId, Set<ws>> 支持同一用户多设备
const onlineUsers = new Map();

function sendToUser(userId, data) {
  const sockets = onlineUsers.get(userId);
  if (sockets) sockets.forEach(ws => ws.send(JSON.stringify(data)));
}
```

### 9.7 路径路由

```javascript
// noServer模式，手动路由
if (request.url.startsWith('/api/realtime/ws')) {
  realtimeHandler(request, socket, head);  // 语音代理
} else if (request.url.startsWith('/ws')) {
  wss.handleUpgrade(request, socket, head);  // 聊天WebSocket
}
```

---

## 10. 3D动画 — Three.js跨平台实现

### 10.1 跨平台适配

```javascript
if (Platform.OS === 'web') {
  // Web平台：iframe srcDoc
  return <iframe srcDoc={THREE_HTML} sandbox="allow-scripts allow-same-origin" />;
}
// 原生平台：WebView
return <WebView source={{ html: THREE_HTML }} onMessage={onMessage} />;
```

### 10.2 3D爱心实现

| 层次 | 技术 | 作用 |
|------|------|------|
| 爱心形状 | 贝塞尔曲线Shape + ExtrudeGeometry | 2D→3D立体 |
| 实体层 | MeshPhongMaterial (粉色+自发光) | 主体 |
| 发光层 | MeshBasicMaterial (opacity:0.08, 放大1.15倍) | 外圈光晕 |
| 线框层 | MeshBasicMaterial (wireframe, opacity:0.05) | 科技感 |
| 灯光 | 3盏PointLight (粉/紫/浅粉) | 立体光影 |
| 粒子 | 2000个, AdditiveBlending | 星尘环绕 |

### 10.3 动画系统

```javascript
// 阶段1：弹性生长（0~1.4秒）
function easeOutElastic(t) {
  return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * 2 * Math.PI / 0.3) + 1;
}

// 阶段2：呼吸脉动（1.4秒后）
scale = targetScale + Math.sin(time * 2.5) * 0.015;

// Y轴持续旋转
heart.rotation.y += 0.006;
```

### 10.4 RN ↔ WebView通信

```
原生平台：WebView postMessage('done') → onMessage回调
Web平台：window.parent.postMessage('transition-done') → message事件监听
超时保底：5秒后自动跳过动画
```

### 10.5 CDN策略

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
<script>if(typeof THREE==='undefined'){
  document.write('<script src="https://unpkg.com/three@0.128.0/build/three.min.js"><\/script>')
}</script>
```

jsDelivr（国内优先）→ unpkg（备用fallback）→ 5秒超时保底。

---

## 11. 国际化 i18n

**文件**：`client/LanguageContext.js`

```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: { zh: { translation: zhTranslations }, en: { translation: enTranslations } },
  lng: 'zh',
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
});
```

- 支持中英文切换
- AsyncStorage持久化语言设置
- 切换时调用 `i18n.changeLanguage(lang)`

---

## 12. 主题换肤

**文件**：`client/ThemeContext.js`

| 主题色 | 名称 |
|-------|------|
| teal | 青绿 |
| purple | 梦幻紫 |
| pink | 活力粉 |
| blue | 天空蓝 |
| orange | 阳光橙 |
| green | 清新绿 |

6色 × 亮暗模式 = 12种外观，AsyncStorage持久化。

---

## 13. 数据库设计

**文件**：`server/database/init.sql`

### 表结构

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `users` | 用户表 | id, username, phone, password(bcrypt), nickname, avatar |
| `user_sessions` | 会话表 | user_id, session_id, refresh_token_hash, salt, is_revoked, expires_at |
| `chat_history` | AI聊天历史 | user_id, role, content, model |
| `friendships` | 好友关系 | requester_id, addressee_id, status(pending/accepted/rejected) |
| `private_messages` | 私聊消息 | sender_id, receiver_id, content, is_read |
| `verification_codes` | 验证码 | phone, code, expires_at, attempts |

### 索引

```sql
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token_hash ON user_sessions(refresh_token_hash);
CREATE INDEX idx_chat_history_user_pair ON chat_history(sender_id, receiver_id);
CREATE INDEX idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX idx_private_messages_receiver ON private_messages(receiver_id);
```

### 开发模式

开发环境使用内存数据库（`server/database/index.js`），模拟PostgreSQL的 `pool.query()` 接口，无需安装PostgreSQL即可运行。

---

## 14. Docker容器化部署

**文件**：`docker-compose.yml`

### 服务编排

| 服务 | 镜像 | 端口 | 内存限制 |
|------|------|------|---------|
| postgres | postgres:16 | 5432 | 512M |
| server | Node.js | 3000 | 512M |
| client | Expo Web静态 | 80 | 256M |
| nginx | nginx:alpine | 80/443 | 128M |

### Nginx反向代理

```nginx
location /api/ { proxy_pass http://server:3000; }
location /ws { proxy_pass http://server:3000; proxy_http_version 1.1; proxy_set_header Upgrade $upgrade; }
location / { proxy_pass http://client:80; }
```

### 启动命令

```bash
docker-compose up -d
```

---

## 15. 企业级优化

### 15.1 Token截断 — 防超context崩溃

**文件**：`server/index.js`

```javascript
const MAX_CONTEXT_TOKENS = 12000;

function truncateMessages(systemMsg, historyMsgs, currentMsg) {
  const core = [systemMsg, currentMsg];  // 必须保留
  const budget = MAX_CONTEXT_TOKENS - estimateTokens(core);
  if (budget <= 0) return core;

  const result = [systemMsg];
  let used = 0;
  for (let i = historyMsgs.length - 1; i >= 0; i--) {  // 从最新往前加
    const msgTokens = estimateTokens([historyMsgs[i]]);
    if (used + msgTokens > budget) break;
    result.splice(1, 0, historyMsgs[i]);
    used += msgTokens;
  }
  result.push(currentMsg);
  return result;
}
```

### 15.2 速率限制 — 内存滑动窗口

```javascript
const rateLimitMap = new Map();  // { userId → { timestamps: [] } }
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;  // 15分钟
const RATE_LIMIT_MAX = 30;

function checkRateLimit(userId) {
  const now = Date.now();
  const record = rateLimitMap.get(userId) || { timestamps: [] };
  record.timestamps = record.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (record.timestamps.length >= RATE_LIMIT_MAX) return false;
  record.timestamps.push(now);
  rateLimitMap.set(userId, record);
  return true;
}
```

### 15.3 输入校验 — 防XSS注入

```javascript
const DANGEROUS_PATTERNS = [
  /<script\b/i, /javascript\s*:/i, /on\w+\s*=/i, /data\s*:\s*text\/html/i,
];

function validateInput(message) {
  if (message && message.length > 5000) return { valid: false, error: "消息过长" };
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(message)) return { valid: false, error: "不安全内容" };
  }
  return { valid: true };
}
```

### 15.4 请求超时控制

```javascript
const timeoutId = setTimeout(() => {
  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify({ type: "error", content: "请求超时" })}\n\n`);
    res.end();
  }
}, 60000);  // 60秒超时

// 收到第一个chunk时清除
for await (const chunk of stream) {
  clearTimeout(timeoutId);
  // ...
}
```

---

## 16. 页面渲染流程

```
App启动
  │
  ├─ 4个Provider初始化（Auth→Theme→Language→WebSocket）
  │   ├─ AuthProvider: 从AsyncStorage读取Token
  │   ├─ ThemeProvider: 从AsyncStorage读取主题
  │   ├─ LanguageProvider: 从AsyncStorage读取语言
  │   └─ WebSocketProvider: 等待认证后连接
  │
  ├─ isLoading=true → LoadingScreen
  │
  ├─ Token无效 → LoginScreen
  │   └─ 登录成功 → isAuthenticated=true → 重新渲染
  │
  ├─ Token有效 → TransitionScreen（3D爱心动画3.5秒）
  │   └─ 动画完成 → MainTabs
  │
  └─ MainTabs（4个Tab）
      ├─ MessagesScreen: WebSocket实时消息 + FlatList
      ├─ CirclesScreen: WebView高德地图
      ├─ AIChatScreen: SSE流式AI对话
      └─ ProfileScreen: 主题/i18n设置
```

---

## 17. 技术亮点汇总

| # | 亮点 | 文件 | 说明 |
|---|------|------|------|
| 1 | HMAC-SHA256存储refreshToken | `server/utils/jwt.js` | 数据库拖库无法还原token |
| 2 | Token轮转（一次性refreshToken） | `server/services/authService.js` | 防重放攻击 |
| 3 | 单点登录 | `server/services/authService.js` | 新登录踢掉旧设备 |
| 4 | 并发刷新去重 | `client/AuthContext.js` | 多401只触发一次刷新 |
| 5 | 401无感刷新 | `client/AuthContext.js` | 用户零感知 |
| 6 | 数据库事务+行锁 | `server/services/authService.js` | 防并发竞态 |
| 7 | LangChain + SSE流式 | `server/index.js` | 逐token推送 |
| 8 | SSE半包处理 | `client/screens/AIChatScreen.js` | buffer+split+pop |
| 9 | UTF-8跨chunk | `client/screens/AIChatScreen.js` | TextDecoder stream:true |
| 10 | AbortController流式中断 | `client/screens/AIChatScreen.js` | 停止生成 |
| 11 | 多角色人格切换 | `server/index.js` | 5种角色+不同temperature |
| 12 | 深度思考模式 | `server/index.js` | mimo-v2.5-pro + reasoning |
| 13 | 多模态识图 | `server/index.js` | HumanMessage content数组 |
| 14 | RAG检索增强 | `server/index.js` | 本地384维向量+Top3检索 |
| 15 | 联网搜索 | `server/index.js` | 博查API+来源推送 |
| 16 | 语音代理 | `server/index.js` | JWT+ffmpeg+WAV头 |
| 17 | 原生WebSocket | `server/websocket.js` | 非Socket.IO，自实现心跳/重连 |
| 18 | Three.js跨平台 | `client/screens/TransitionScreen.js` | Web用iframe/原生用WebView |
| 19 | CDN双fallback | `client/screens/TransitionScreen.js` | jsdelivr→unpkg→5秒超时 |
| 20 | Token截断 | `server/index.js` | 防超context崩溃 |
| 21 | 速率限制 | `server/index.js` | 内存滑动窗口 |
| 22 | 输入校验 | `server/index.js` | 防XSS+长度限制 |
| 23 | 请求超时 | `server/index.js` | 60秒自动断开 |
| 24 | 6色×亮暗主题 | `client/ThemeContext.js` | 12种外观 |
| 25 | i18n国际化 | `client/LanguageContext.js` | 中英文切换 |
| 26 | Docker容器化 | `docker-compose.yml` | 4服务编排+Nginx |

---

> **文档结束** — MeetU v1.0 技术文档
