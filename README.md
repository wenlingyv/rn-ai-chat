# RN AI Chat 应用

React Native AI聊天应用，支持用户注册登录、JWT双Token认证、用户间即时消息交互。

## 功能特性

### 🔐 用户认证系统
- 手机号+验证码注册/登录
- JWT双Token机制（Access Token + Refresh Token）
- 自动token刷新
- 安全的会话管理

### 💬 聊天功能
- AI智能聊天（支持文本和图片）
- 用户间即时消息
- 聊天历史记录
- RAG知识库集成

### 🎨 UI/UX
- 简洁的社交风格界面
- 主题切换（明暗）
- 国际化支持（中文/英文）
- 响应式设计

## 技术栈

### 前端
- React Native 0.74.1
- Expo 51.0.0
- React Navigation
- Redux + Redux Persist
- i18next
- Axios

### 后端
- Node.js + Express
- PostgreSQL
- JWT (jsonwebtoken)
- LangChain (RAG)
- bcryptjs

## 项目结构

```
.
├── client/                 # React Native 前端
│   ├── screens/           # 页面组件
│   │   ├── LoginScreen.js     # 登录页面
│   │   ├── AIChatScreen.js    # AI聊天页面
│   │   └── MessagesScreen.js  # 消息页面
│   ├── AuthContext.js     # 认证上下文
│   ├── api/              # API工具
│   └── ...
├── server/               # Node.js 后端
│   ├── routes/          # 路由
│   │   └── auth.js      # 认证路由
│   ├── middleware/      # 中间件
│   │   ├── auth.js      # 认证中间件
│   │   └── rateLimiter.js # 限流中间件
│   ├── services/        # 服务
│   │   ├── authService.js    # 认证服务
│   │   └── smsService.js    # 短信服务
│   ├── utils/           # 工具
│   │   └── jwt.js       # JWT工具
│   └── database/       # 数据库
│       ├── init.sql     # 初始化脚本
│       └── migrate.js   # 迁移脚本
├── test/               # 测试脚本
│   └── session-isolation.js # 会话隔离测试
└── docs/               # 文档
    └── superpowers/
        └── specs/     # 设计规格
```

## 安装运行

### 环境要求
- Node.js 16+
- PostgreSQL 12+
- Expo CLI

### 后端设置

1. 创建数据库
```bash
createdb ai_chat
```

2. 安装依赖
```bash
cd server
npm install
```

3. 运行数据库迁移
```bash
node database/migrate.js
```

4. 启动后端
```bash
npm start
```

后端将运行在 http://localhost:5000

### 前端设置

1. 安装依赖
```bash
cd client
npm install
```

2. 启动开发服务器
```bash
npx expo start
```

## API 文档

### 认证相关

#### POST /api/auth/send-code
发送验证码
```json
{
  "phone": "13800138000"
}
```

#### POST /api/auth/register
用户注册
```json
{
  "phone": "13800138000",
  "code": "123456",
  "nickname": "用户昵称"
}
```

#### POST /api/auth/login
用户登录
```json
{
  "phone": "13800138000",
  "code": "123456"
}
```

#### POST /api/auth/refresh
刷新Access Token
```json
{
  "refreshToken": "refresh_token_string"
}
```

#### POST /api/auth/logout
用户登出
```json
{
  "refreshToken": "refresh_token_string"
}
```

#### GET /api/auth/profile
获取用户信息

#### PUT /api/auth/profile
更新用户信息

### 聊天相关

#### POST /api/chat
发送消息
```json
{
  "message": "你好",
  "model": "deepseek-chat",
  "role": "normal",
  "webSearch": false,
  "image": "base64_string",
  "imageType": "image/jpeg"
}
```

#### POST /api/clear
清空聊天历史

## 数据库设计

### users表
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  nickname VARCHAR(50),
  avatar TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_sessions表
```sql
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  access_token_version INTEGER DEFAULT 1,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_revoked BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMP
);
```

### chat_history表
```sql
CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 安全特性

1. **JWT双Token机制**
   - Access Token有效期15分钟
   - Refresh Token有效期7天
   - 支持token吊销

2. **验证码安全**
   - 5分钟有效期
   - 1分钟内只能发送1次
   - 每日最多10次

3. **限流保护**
   - API请求限制
   - 登录尝试限制
   - 验证码发送限制

4. **数据加密**
   - Refresh Token哈希存储
   - 手机号脱敏显示

## 测试

运行会话隔离测试：
```bash
node test/session-isolation.js
```

## 环境变量

创建 `.env` 文件：

```env
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_chat
DB_USER=postgres
DB_PASSWORD=123456

# JWT
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d

# AI服务
MIMO_KEY=your_mimo_api_key
BOCHA_KEY=your_bocha_api_key
```

## 开发指南

### 添加新API端点
1. 在 `server/routes/` 创建路由文件
2. 在 `server/services/` 创建服务逻辑
3. 在 `server/index.js` 中注册路由

### 修改认证流程
1. 更新 `server/middleware/auth.js`
2. 修改 `server/services/authService.js`
3. 调整 `client/AuthContext.js`

### 添加新页面
1. 在 `client/screens/` 创建组件
2. 更新 `client/App.js` 中的导航配置
3. 添加对应的国际化文本

## 许可证

MIT License