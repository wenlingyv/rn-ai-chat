# MeetU AI对话系统升级技术方案

## 基于LangChain + SSE流式输出的架构升级改造

---

## 一、项目背景

### 1.1 当前架构

MeetU AI对话系统采用手写HTTP调用方式实现LLM交互，核心链路为：

```
前端 fetch POST → 后端 axios.post(MIMO_API) → 一次性返回JSON → 前端15ms定时器逐字显示
```

### 1.2 当前技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| LLM调用 | axios.post | 手动构造请求体调用MIMO API |
| 对话历史 | 手写SQL | getHistory() + saveMessage() |
| 角色切换 | ROLE_PROMPTS对象 | 手动映射key→systemPrompt |
| 联网搜索 | axios.post(博查API) | 手动调用 + 手动拼systemPrompt |
| RAG检索 | LangChain(仅分块+向量库) | 手动retrieveContext() + 拼systemPrompt |
| 流式输出 | 伪流式 | 后端一次性返回，前端15ms/字逐字显示 |
| 图片识别 | 手动构造image_url | 手动判断image存在性构造多模态消息 |
| 深度思考 | 手动提取reasoning_content | 正则兜底提取 |

### 1.3 核心痛点

| 痛点 | 影响 |
|------|------|
| 伪流式输出 | 用户需等待AI完整生成后才能看到第一个字，首字延迟10秒+ |
| 手写LLM调用 | 换模型需改业务代码，不可插拔 |
| 手动拼systemPrompt | RAG/搜索/角色三段拼接，维护困难 |
| 联网搜索需手动开关 | 用户需判断何时搜索，体验不佳 |
| LangChain仅用5% | 只用了文本分块和向量库，未发挥框架能力 |
| 无流式中断 | 用户无法停止AI生成，浪费token |

---

## 二、升级目标

### 2.1 总体目标

将AI对话系统从"手写HTTP调用 + 伪流式"升级为"LangChain标准化 + SSE真流式"，实现：

- **真流式输出**：首字延迟从10秒+降至1-2秒
- **LangChain标准化**：LLM调用/历史管理/Prompt/工具调用统一框架
- **Agent自主决策**：AI自主判断是否需要联网搜索或查知识库
- **可插拔模型**：换模型只改配置，不改业务代码

### 2.2 升级前后对比

| 方面 | 升级前 | 升级后 |
|------|--------|--------|
| LLM调用 | axios.post手动构造 | LangChain ChatOpenAI |
| 对话历史 | 手写SQL + 手动拼messages | ConversationBufferMemory + PostgresChatMessageHistory |
| 角色切换 | ROLE_PROMPTS手动映射 | ChatPromptTemplate |
| 联网搜索 | 手动调API + 拼systemPrompt | LangChain Tool + Agent |
| RAG检索 | 手动retrieveContext + 拼prompt | RetrievalQA Chain |
| 流式输出 | 伪流式（15ms定时器） | 真SSE流式（逐token推送） |
| 图片识别 | 手动构造image_url消息 | LangChain HumanMessage多模态 |
| 深度思考 | 手动提取reasoning_content | 自定义OutputParser |

---

## 三、新增技术依赖

### 3.1 后端依赖（server/）

```
langchain                    LangChain核心框架
@langchain/core              基础抽象层（Callbacks、Messages等）
@langchain/openai            OpenAI兼容模型适配器（MIMO API兼容OpenAI格式）
@langchain/community         社区工具（向量存储、检索器等）
```

### 3.2 可选依赖

```
@langchain/pinecone          Pinecone云向量库（替代MemoryVectorStore）
pgvector                     PostgreSQL向量扩展（替代MemoryVectorStore）
@langchain/google-genai      如果未来接入Gemini模型
```

### 3.3 前端依赖

无需新增。SSE流式接收使用原生 `fetch + ReadableStream`，React Native 0.74+原生支持。

---

## 四、后端改造详细方案

### 4.1 LLM调用层：axios → ChatOpenAI

#### 当前实现

```javascript
const result = await axios.post(
  "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions",
  { model: isReason ? "mimo-v2.5-pro" : "mimo-v2.5", messages, temperature },
  { headers: { Authorization: `Bearer ${MIMO_KEY}` } }
);
```

#### 目标实现

```javascript
const chatModel = new ChatOpenAI({
  modelName: isReason ? "mimo-v2.5-pro" : "mimo-v2.5",
  temperature: isReason ? 0.1 : role === "angry" ? 1.3 : 0.7,
  streaming: true,                    // 开启流式
  openAIApiKey: MIMO_KEY,
  configuration: {
    baseURL: "https://token-plan-sgp.xiaomimimo.com/v1"  // MIMO兼容OpenAI格式
  }
});
```

#### 改造要点

- MIMO API兼容OpenAI格式，直接使用 `@langchain/openai` 的 `ChatOpenAI`
- `streaming: true` 是SSE流式输出的前提
- 模型切换只需改 `modelName`，业务代码不变
- `configuration.baseURL` 指向MIMO API地址

---

### 4.2 对话历史：手写SQL → ConversationBufferMemory

#### 当前实现

```javascript
// 读取历史
async function getHistory(userId) {
  const { rows } = await pool.query(
    `SELECT role, content FROM chat_history WHERE user_id = $1 ORDER BY created_at ASC`, [userId]
  );
  return rows;
}

// 保存消息
async function saveMessage(userId, role, content) {
  await pool.query(
    `INSERT INTO chat_history (user_id, role, content) VALUES ($1, $2, $3)`,
    [userId, role, content]
  );
}

// 手动拼入messages
const history = await getHistory(userId);
const messages = [
  { role: "system", content: systemPrompt },
  ...history,
  { role: "user", content: userContent }
];
```

#### 目标实现

```javascript
import { ConversationBufferMemory } from "langchain/memory";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";

// 每个用户一个memory实例
const memory = new ConversationBufferMemory({
  chatHistory: new PostgresChatMessageHistory({
    pool,                          // 复用现有PostgreSQL连接池
    sessionId: `user_${userId}`,   // 按用户隔离
    tableName: "chat_message",     // LangChain标准表名
  }),
  returnMessages: true,            // 返回Message对象而非字符串
  memoryKey: "history",            // 与PromptTemplate的占位符对应
});

// 自动读取历史 + 自动保存，不再手写getHistory/saveMessage
const response = await chain.call({ input: message });
```

#### 改造要点

- 需新建 `chat_message` 表（LangChain标准格式：id, session_id, message JSON, type）
- `sessionId` 按用户ID隔离，每个用户独立对话历史
- Memory自动管理历史的读取和保存，删除手写的 `getHistory()` 和 `saveMessage()`
- `returnMessages: true` 确保返回Message对象，与PromptTemplate兼容

---

### 4.3 角色切换：ROLE_PROMPTS → ChatPromptTemplate

#### 当前实现

```javascript
const ROLE_PROMPTS = {
  normal: "你是实用型AI助手，正常友好回答问题。",
  angry:  "你是暴躁型AI，说话直接简短，语气不耐烦。",
  // ...
};

let systemPrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS.normal;
// 手动追加RAG和搜索结果
if (ragContext) systemPrompt += `\n\n【本地知识库】请根据以下资料回答：\n${ragContext}`;
if (searchResult) systemPrompt += `\n资料：\n${searchResult.text}`;
```

#### 目标实现

```javascript
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

// 角色模板映射
const ROLE_TEMPLATES = {
  normal:    "你是实用型AI助手，正常友好回答问题。",
  knowledge: "你是专业知识型AI，回答严谨、内容详实、逻辑清晰。",
  angry:     "你是暴躁型AI，说话直接简短，语气不耐烦。",
  funny:     "你是搞笑型AI，语言幽默风趣，善于玩梗。",
  gentle:    "你是温柔型AI，语气亲切耐心，风格治愈。",
};

// 构建Prompt模板
const prompt = ChatPromptTemplate.fromMessages([
  ["system", ROLE_TEMPLATES[role] + "\n\n{context}"],  // context变量注入RAG/搜索结果
  new MessagesPlaceholder("history"),                    // 历史对话占位
  ["human", "{input}"],                                  // 用户输入占位
]);

// 变量注入
const context = [];
if (ragContext) context.push(`【本地知识库】请根据以下资料回答：\n${ragContext}`);
if (searchResult) context.push(`资料：\n${searchResult.text}`);

const chain = prompt.pipe(chatModel);
const response = await chain.invoke({
  input: message,
  history: await memory.chatHistory.getMessages(),
  context: context.join("\n\n"),
});
```

#### 改造要点

- `MessagesPlaceholder("history")` 自动插入对话历史
- `{context}` 变量统一注入RAG和搜索结果，不再手动拼字符串
- 角色切换只需换 `ROLE_TEMPLATES[role]`，模板结构不变
- Prompt与业务逻辑分离，可独立测试和调整

---

### 4.4 联网搜索：手动调用 → Tool + Agent

#### 当前实现

```javascript
// 用户手动开启🌐开关
if (webSearch && message) {
  searchResult = await searchWeb(message);
  searchSources = searchResult.sources || [];
}
if (webSearch && searchResult?.text) {
  systemPrompt += `\n资料：\n${searchResult.text}`;
}
```

#### 目标实现

```javascript
import { DynamicTool } from "@langchain/core/tools";
import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";

// 定义搜索工具
const searchTool = new DynamicTool({
  name: "web_search",
  description: "当需要查询最新信息、实时数据或不确定的事实性问题时，使用此工具搜索互联网",
  func: async (query) => {
    const result = await searchWeb(query);
    return result.text;
  },
});

// 定义知识库工具
const knowledgeTool = new DynamicTool({
  name: "knowledge_base",
  description: "当用户询问关于MeetU产品功能、使用方法等内部知识时，使用此工具检索本地知识库",
  func: async (query) => {
    return await retrieveContext(query);
  },
});

// 创建Agent
const agent = await createOpenAIFunctionsAgent({
  llm: chatModel,
  tools: [searchTool, knowledgeTool],
  prompt,
});

const agentExecutor = new AgentExecutor({
  agent,
  tools: [searchTool, knowledgeTool],
  memory,
  verbose: true,   // 调试时查看Agent决策过程
});

// Agent自主决定是否调用工具
const response = await agentExecutor.call({ input: message });
```

#### 改造要点

- **AI自主决策**：Agent根据用户问题自动判断是否需要搜索/查知识库，无需用户手动开关
- `description` 是关键：AI根据工具描述决定是否调用，需精确描述适用场景
- 搜索来源（sources）需通过Agent的intermediate_steps提取，返回给前端展示
- 可选：保留手动开关作为"强制搜索"模式，覆盖Agent决策

---

### 4.5 RAG检索：半手写 → RetrievalQA Chain

#### 当前实现

```javascript
// 手动检索 + 手动拼prompt
let ragContext = await retrieveContext(message);
if (ragContext) {
  systemPrompt += `\n\n【本地知识库】请根据以下资料回答：\n${ragContext}`;
}
```

#### 目标实现

```javascript
import { RetrievalQAChain } from "langchain/chains";

// 方案A：独立RAG Chain
const ragChain = RetrievalQAChain.fromLLM(
  chatModel,
  vectorStore.asRetriever(3),   // Top3相似文档
  {
    returnSourceDocuments: true,  // 返回来源文档
  }
);
const ragResult = await ragChain.call({ query: message });
// ragResult.source_documents 可展示来源

// 方案B：与Agent集成（推荐）
// RAG作为Tool注册到Agent，AI自主决定何时查知识库
// 见4.4节的knowledgeTool
```

#### 改造要点

- 方案A（独立Chain）：简单直接，但RAG每次都触发
- 方案B（Agent Tool）：AI自主决定是否查知识库，更智能
- `returnSourceDocuments: true` 可获取知识库来源，前端展示
- 向量库可保留MemoryVectorStore，或升级为pgvector/Pinecone持久化

---

### 4.6 SSE流式输出：伪流式 → 真流式（核心改造）

#### 当前实现

```
后端: axios.post → 等LLM完整返回 → res.json({ reply: "完整文本" })
前端: 收到完整JSON → 15ms定时器逐字显示
```

#### 后端目标实现

```javascript
// SSE响应头
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no');  // Nginx不缓冲

// 流式回调
const stream = await chain.stream({
  input: message,
  history: await memory.chatHistory.getMessages(),
  context: contextStr,
}, {
  callbacks: [
    {
      handleLLMNewToken(token) {
        // 逐token推送
        res.write(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`);
      },
      handleLLMEnd() {
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
      },
      handleLLMError(error) {
        res.write(`data: ${JSON.stringify({ type: "error", content: error.message })}\n\n`);
        res.end();
      },
    },
  ],
});
```

#### 思考过程流式推送

```javascript
// 深度思考模式：reasoning_content也流式推送
// MIMO API的streaming响应中，reasoning_content和content分开返回
// 需要在回调中区分处理

handleLLMNewToken(token, runId, parentRunId, tags, metadata) {
  if (metadata?.type === 'reasoning') {
    // 思考过程token
    res.write(`data: ${JSON.stringify({ type: "thinking", content: token })}\n\n`);
  } else {
    // 正式回复token
    res.write(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`);
  }
}
```

#### 搜索来源推送

```javascript
// Agent执行完搜索工具后，推送搜索来源
handleToolStart(tool) {
  if (tool.name === 'web_search') {
    res.write(`data: ${JSON.stringify({ type: "searching", content: "正在搜索..." })}\n\n`);
  }
}
handleToolEnd(output, tool) {
  if (tool.name === 'web_search') {
    // 解析搜索来源
    const sources = extractSources(output);
    res.write(`data: ${JSON.stringify({ type: "sources", data: sources })}\n\n`);
  }
}
```

#### SSE事件类型定义

| 事件类型 | 数据格式 | 说明 |
|---------|---------|------|
| `token` | `{ type: "token", content: "字" }` | AI回复的每个token |
| `thinking` | `{ type: "thinking", content: "..." }` | 深度思考过程 |
| `sources` | `{ type: "sources", data: [...] }` | 搜索来源列表 |
| `searching` | `{ type: "searching", content: "..." }` | 正在搜索提示 |
| `done` | `{ type: "done" }` | 生成结束 |
| `error` | `{ type: "error", content: "..." }` | 错误信息 |

---

### 4.7 多模态图片：手动构造 → HumanMessage

#### 当前实现

```javascript
let userContent = image
  ? [
      { type: "image_url", image_url: { url: `data:${imageType};base64,${image}` } },
      { type: "text", text: message || "请描述这张图片" }
    ]
  : message;
```

#### 目标实现

```javascript
import { HumanMessage } from "@langchain/core/messages";

// 统一使用HumanMessage，自动处理单模态/多模态
const userMessage = image
  ? new HumanMessage({
      content: [
        { type: "image_url", image_url: { url: `data:${imageType};base64,${image}` } },
        { type: "text", text: message || "请描述这张图片" },
      ],
    })
  : new HumanMessage({ content: message });

// 直接传入chain
const response = await chain.invoke({
  input: userMessage,   // HumanMessage对象
  history: await memory.chatHistory.getMessages(),
  context: contextStr,
});
```

#### 改造要点

- LangChain的 `HumanMessage` 标准化了多模态消息格式
- 不再需要手动判断image存在性来决定content是字符串还是数组
- 与Memory兼容，历史记录中多模态消息也能正确存储

---

## 五、前端改造详细方案

### 5.1 SSE流式接收

#### 当前实现

```javascript
const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(body) });
const data = await res.json();           // 一次性获取完整JSON
// 15ms定时器逐字显示
for (let i = 0; i < fullText.length; i++) {
  currentText += fullText[i];
  setMessages(prev => ...);
  await new Promise(resolve => setTimeout(resolve, 15));
}
```

#### 目标实现

```javascript
const response = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop();  // 保留不完整的行

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6);
    if (data === '[DONE]') break;

    try {
      const event = JSON.parse(data);
      switch (event.type) {
        case 'token':
          // 实时追加AI回复文字
          setMessages(prev => prev.map((msg, idx) =>
            idx === prev.length - 1
              ? { ...msg, content: (msg.content || '') + event.content }
              : msg
          ));
          break;
        case 'thinking':
          // 实时追加思考过程
          setMessages(prev => prev.map((msg, idx) =>
            idx === prev.length - 1
              ? { ...msg, thinking: (msg.thinking || '') + event.content }
              : msg
          ));
          break;
        case 'sources':
          // 设置搜索来源
          setMessages(prev => prev.map((msg, idx) =>
            idx === prev.length - 1
              ? { ...msg, searchSources: event.data }
              : msg
          ));
          break;
        case 'done':
          // 流式结束
          setLoading(false);
          break;
        case 'error':
          Alert.alert('错误', event.content);
          setLoading(false);
          break;
      }
    } catch (e) {
      // JSON解析失败，忽略
    }
  }
}
```

### 5.2 流式中断

```javascript
// 新增：AbortController支持流式中断
const abortController = new AbortController();

const response = await fetch(API_URL, {
  signal: abortController.signal,  // 绑定中断信号
  // ...
});

// 用户点击"停止生成"按钮
const stopGeneration = () => {
  abortController.abort();
  setLoading(false);
};
```

### 5.3 UI变化

| 变化点 | 说明 |
|--------|------|
| 删除15ms定时器 | 不再需要伪流式逐字显示 |
| 新增"停止生成"按钮 | 流式输出中显示，点击中断 |
| 思考过程实时展示 | 不用等AI完整回复，思考过程流式显示 |
| 搜索来源即时显示 | Agent搜索完成后立即展示，不等最终回复 |
| 首字1-2秒出现 | 真流式，第一个token到达即显示 |

---

## 六、数据库变更

### 6.1 新建 chat_message 表

LangChain的 `PostgresChatMessageHistory` 需要标准格式的消息表：

```sql
CREATE TABLE IF NOT EXISTS chat_message (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,          -- 会话ID，按用户隔离
  message JSONB NOT NULL,            -- 消息内容（LangChain Message JSON格式）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_message_session ON chat_message (session_id);
```

### 6.2 旧表处理

- `chat_history` 表可保留，用于历史数据迁移
- 迁移完成后可删除 `chat_history` 表
- 其他表（users, user_sessions, friendships, private_messages）不受影响

---

## 七、改造后的完整架构

```
┌──────────────────────────────────────────────────────────────┐
│                        前端 (React Native)                    │
│                                                               │
│  fetch + ReadableStream → SSE事件流解析                        │
│    ├── token事件    → 实时追加AI回复文字                        │
│    ├── thinking事件 → 实时追加思考过程                          │
│    ├── sources事件  → 显示搜索来源                             │
│    ├── done事件     → 流式结束                                 │
│    └── error事件    → 错误提示                                 │
│                                                               │
│  AbortController → 流式中断（停止生成）                        │
└───────────────────────────┬──────────────────────────────────┘
                            │ SSE (text/event-stream)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     后端 (Node.js + LangChain)                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ChatOpenAI (streaming: true)                        │    │
│  │    ├── modelName: mimo-v2.5 / mimo-v2.5-pro          │    │
│  │    ├── temperature: 0.1 / 0.7 / 1.3                  │    │
│  │    └── baseURL: MIMO API                              │    │
│  └──────────────────────────────────────────────────────┘    │
│                            │                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ChatPromptTemplate                                  │    │
│  │    ├── SystemMessage: ROLE_TEMPLATES[role] + {context}│    │
│  │    ├── MessagesPlaceholder: {history}                 │    │
│  │    └── HumanMessage: {input}                          │    │
│  └──────────────────────────────────────────────────────┘    │
│                            │                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ConversationBufferMemory                            │    │
│  │    └── PostgresChatMessageHistory (chat_message表)    │    │
│  └──────────────────────────────────────────────────────┘    │
│                            │                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  AgentExecutor (可选)                                 │    │
│  │    ├── web_search Tool → 博查API                      │    │
│  │    └── knowledge_base Tool → vectorStore.asRetriever  │    │
│  └──────────────────────────────────────────────────────┘    │
│                            │                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Callbacks (SSE流式推送)                              │    │
│  │    ├── handleLLMNewToken → res.write(token事件)       │    │
│  │    ├── handleToolStart → res.write(searching事件)     │    │
│  │    ├── handleToolEnd → res.write(sources事件)         │    │
│  │    └── handleLLMEnd → res.write(done事件)             │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  RAG (保留 + 可选升级)                                │    │
│  │    ├── MemoryVectorStore / Pinecone / pgvector        │    │
│  │    ├── LocalEmbedding / OpenAIEmbeddings              │    │
│  │    └── RecursiveCharacterTextSplitter                 │    │
│  └──────────────────────────────────────────────────────┘    │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     PostgreSQL                                │
│  ├── users              用户表（不变）                         │
│  ├── user_sessions      会话表（不变）                         │
│  ├── friendships        好友关系表（不变）                     │
│  ├── private_messages   聊天消息表（不变）                     │
│  └── chat_message       AI聊天记录表（新建，LangChain标准格式） │
└──────────────────────────────────────────────────────────────┘
```

---

## 八、改造阶段与优先级

### 第一阶段：SSE流式输出 + ChatOpenAI（核心提升）

**目标**：解决首字延迟问题，用户体验质变

| 改造项 | 涉及文件 | 工作量 |
|--------|---------|--------|
| 安装@langchain/openai | server/package.json | 小 |
| ChatOpenAI替换axios | server/index.js | 中 |
| SSE响应头 + Callbacks | server/index.js | 中 |
| 前端ReadableStream接收 | client/AIChatScreen.js | 中 |
| 删除15ms定时器伪流式 | client/AIChatScreen.js | 小 |
| 新增"停止生成"按钮 | client/AIChatScreen.js | 小 |

**预期效果**：首字延迟从10秒+降至1-2秒

### 第二阶段：Memory + PromptTemplate（架构标准化）

**目标**：对话历史和Prompt管理标准化

| 改造项 | 涉及文件 | 工作量 |
|--------|---------|--------|
| 新建chat_message表 | server/database/ | 小 |
| ConversationBufferMemory | server/index.js | 中 |
| PostgresChatMessageHistory | server/index.js | 中 |
| ChatPromptTemplate | server/index.js | 中 |
| 删除手写getHistory/saveMessage | server/index.js | 小 |

**预期效果**：历史管理标准化，代码量减少

### 第三阶段：Tool + Agent（智能增强）

**目标**：AI自主决策搜索/检索

| 改造项 | 涉及文件 | 工作量 |
|--------|---------|--------|
| 定义SearchTool | server/index.js | 小 |
| 定义KnowledgeTool | server/index.js | 小 |
| createOpenAIFunctionsAgent | server/index.js | 中 |
| AgentExecutor | server/index.js | 中 |
| 搜索来源流式推送 | server/index.js | 中 |
| 前端sources事件处理 | client/AIChatScreen.js | 小 |

**预期效果**：AI自主判断何时搜索/查知识库，无需用户手动开关

### 第四阶段：RAG升级 + 可选优化

**目标**：RAG检索更准确，向量库持久化

| 改造项 | 涉及文件 | 工作量 |
|--------|---------|--------|
| OpenAIEmbeddings替换LocalEmbedding | server/index.js | 小 |
| pgvector/Pinecone替换MemoryVectorStore | server/index.js | 中 |
| RetrievalQAChain或Agent Tool | server/index.js | 中 |
| HumanMessage多模态标准化 | server/index.js | 小 |
| 深度思考OutputParser | server/index.js | 中 |

**预期效果**：RAG检索准确率提升，向量库重启不丢失

---

## 九、升级亮点总结

### 9.1 技术亮点

| 亮点 | 说明 | 价值 |
|------|------|------|
| **真SSE流式输出** | 伪流式→真流式，逐token实时推送 | 首字延迟从10秒+降至1-2秒，用户体验质变 |
| **LangChain标准化** | LLM/History/Prompt/Tool统一框架 | 可维护性提升，换模型只改配置 |
| **Agent自主决策** | AI自主判断是否搜索/查知识库 | 智能化提升，无需用户手动开关 |
| **流式中断** | AbortController支持停止生成 | 节省token，用户可控 |
| **可插拔模型** | ChatOpenAI抽象层 | 换模型零业务代码改动 |
| **Memory标准化** | PostgresChatMessageHistory | 多会话隔离，标准格式 |

### 9.2 架构亮点

| 亮点 | 说明 |
|------|------|
| **渐进式升级** | 四个阶段独立可交付，不影响现有功能 |
| **向后兼容** | 旧chat_history表可迁移，其他表不受影响 |
| **前端零依赖** | SSE用原生fetch + ReadableStream，无需新增依赖 |
| **MIMO兼容** | ChatOpenAI直接兼容MIMO API，无需适配层 |

### 9.3 论文/答辩可讲要点

1. **从伪流式到真流式**：对比首字延迟、用户感知、技术实现差异
2. **LangChain框架引入**：从手写HTTP到标准化框架的架构演进
3. **Agent自主决策**：从用户手动开关到AI自主判断的智能化提升
4. **渐进式架构升级**：单体架构中引入框架的阶段性策略
5. **SSE vs WebSocket**：流式输出场景下SSE的优势（单向推送、HTTP兼容、自动重连）

---

## 十、风险评估

| 风险 | 影响 | 应对 |
|------|------|------|
| MIMO API流式兼容性 | MIMO可能不完全兼容OpenAI streaming格式 | 先用小脚本测试MIMO streaming响应格式 |
| React Native ReadableStream兼容性 | 部分RN版本ReadableStream支持不完整 | 降级方案：使用XMLHttpRequest的onprogress |
| Agent决策不稳定 | AI可能过度调用搜索工具或不调用 | 调整Tool description，增加few-shot示例 |
| PostgresChatMessageHistory性能 | 大量历史消息时查询变慢 | 设置历史消息窗口上限（如最近50条） |
| 思考过程流式解析 | MIMO的reasoning_content流式格式需验证 | 先测试MIMO streaming响应中reasoning字段格式 |

---

## 十一、验收标准

### 第一阶段验收

- [ ] AI回复第一个字在2秒内出现
- [ ] 文字逐token实时显示，无卡顿
- [ ] 思考过程流式展示
- [ ] 可点击"停止生成"中断输出
- [ ] 原有功能（角色切换/图片识别/深度思考）不受影响

### 第二阶段验收

- [ ] 对话历史自动保存到chat_message表
- [ ] 刷新页面后历史对话正常恢复
- [ ] 角色切换Prompt模板正常工作
- [ ] 删除手写getHistory/saveMessage函数

### 第三阶段验收

- [ ] AI自主判断是否需要联网搜索
- [ ] AI自主判断是否需要查知识库
- [ ] 搜索来源正确展示
- [ ] 不开启Agent时原有功能正常

### 第四阶段验收

- [ ] RAG检索准确率提升
- [ ] 向量库重启后不丢失
- [ ] 多模态图片识别正常工作
- [ ] 深度思考过程正确提取
