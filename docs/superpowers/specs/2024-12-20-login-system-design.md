# 登录系统设计文档

## 项目概述
为RN AI聊天应用添加手机号注册登录功能，实现用户会话隔离，支持用户间的即时消息交互。

## 技术架构

### 前端技术栈
- **框架**: React Native + Expo
- **导航**: React Navigation (底部Tab + Stack)
- **状态管理**: React Context + Redux Persist
- **存储**: AsyncStorage + Expo SecureStorage
- **UI组件**: 自定义组件，简洁社交风格
- **国际化**: i18next (已有)

### 后端技术栈
- **框架**: Node.js + Express
- **认证**: JWT双Token机制
- **数据库**: PostgreSQL
- **AI集成**: LangChain (保持现有)
- **安全**: bcryptjs + rate limiting

### 数据库设计

#### users表
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

#### user_sessions表
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

#### chat_history表（修改）
```sql
-- 添加用户相关字段
ALTER TABLE chat_history ADD COLUMN sender_id INTEGER REFERENCES users(id);
ALTER TABLE chat_history ADD COLUMN receiver_id INTEGER REFERENCES users(id);

-- 添加索引
CREATE INDEX idx_chat_history_user_pair ON chat_history(sender_id, receiver_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at);
```

### JWT双Token机制

#### Access Token
- 有效期：15分钟
- 用途：API请求认证
- 存储：内存（React Context）
- 内容：
  - userId
  - sessionId
  - iat (签发时间)
  - exp (过期时间)

#### Refresh Token
- 有效期：7天
- 用途：刷新Access Token
- 存储：SecureStorage（加密）
- 内容：
  - userId
  - sessionId
  - version (版本号，用于吊销)
  - exp (过期时间)

### 认证流程

#### 1. 用户注册
```
手机号输入 → 发送验证码 → 验证码验证 → 创建用户 → 返回双Token
```

#### 2. 用户登录
```
手机号输入 → 发送验证码 → 验证码验证 → 验证用户 → 返回双Token
```

#### 3. API请求认证
```
1. 检查Access Token是否存在且有效
2. 如果无效且未尝试过刷新，尝试用Refresh Token刷新
3. 刷新成功后重试请求
4. 如果刷新失败或Refresh Token无效，跳转登录页
```

#### 4. Token刷新
```
1. 验证Refresh Token有效性
2. 生成新的Access Token
3. 更新Session的最后使用时间
4. 返回新的Access Token
```

#### 5. 用户登出
```
1. 将Refresh Token标记为已吊销
2. 清除本地存储的Token
3. 跳转登录页
```

## API设计

### 认证相关API

#### POST /api/auth/send-code
```json
{
  "phone": "13800138000"
}
```
**响应:**
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

#### POST /api/auth/register
```json
{
  "phone": "13800138000",
  "code": "123456",
  "nickname": "用户昵称"
}
```
**响应:**
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": {
      "id": 1,
      "phone": "13800138000",
      "nickname": "用户昵称"
    }
  }
}
```

#### POST /api/auth/login
```json
{
  "phone": "13800138000",
  "code": "123456"
}
```
**响应:** 同register

#### POST /api/auth/refresh
```json
{
  "refreshToken": "..."
}
```
**响应:**
```json
{
  "success": true,
  "data": {
    "accessToken": "..."
  }
}
```

#### POST /api/auth/logout
**Headers:**
```
Authorization: Bearer <accessToken>
```
**响应:**
```json
{
  "success": true
}
```

### 用户相关API

#### GET /api/user/profile
**Headers:**
```
Authorization: Bearer <accessToken>
```
**响应:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "phone": "13800138000",
    "nickname": "用户昵称",
    "avatar": "..."
  }
}
```

#### PUT /api/user/profile
**Headers:**
```
Authorization: Bearer <accessToken>
```
**Body:**
```json
{
  "nickname": "新昵称",
  "avatar": "..."
}
```

## 前端页面设计

### 登录页面 (LoginScreen)
- 手机号输入框
- 发送验证码按钮（倒计时）
- 验证码输入框
- 登录按钮
- 注册入口链接

### 注册页面 (RegisterScreen)
- 手机号输入框
- 验证码输入框
- 昵称输入框
- 注册按钮
- 登录入口链接

### 验证码页面 (PhoneVerificationScreen)
- 手机号显示
- 验证码输入框
- 倒计时显示
- 重新发送按钮

## 安全措施

### 1. 验证码安全
- 5分钟有效期
- 1分钟内只能发送1次
- 每日最多发送10次
- 使用Redis缓存（可选）

### 2. Token安全
- Access Token使用短有效期
- Refresh Token支持吊销
- 敏感操作需要重新验证
- 记录设备指纹

### 3. 数据库安全
- 手机号脱敏存储
- 密码使用bcrypt加密
- Session记录IP和User-Agent
- 支持强制下线

## 实现计划

### 第一阶段：后端基础
1. 创建数据库表结构
2. 实现JWT双Token机制
3. 实现验证码发送逻辑
4. 实现用户注册/登录API

### 第二阶段：前端基础
1. 创建登录/注册页面
2. 实现Token管理机制
3. 集成认证到导航结构
4. 实现自动刷新Token

### 第三阶段：功能完善
1. 实现用户信息管理
2. 实现用户间消息功能
3. 添加安全措施
4. 优化用户体验

### 第四阶段：测试和优化
1. 单元测试
2. 集成测试
3. 性能优化
4. 安全审计

## 注意事项

1. **保持现有功能**: AI聊天功能保持完全不变，仅添加用户隔离
2. **向后兼容**: 考虑无用户状态下的默认用户处理
3. **性能考虑**: 合理设置Token有效期，避免频繁刷新
4. **错误处理**: 提供友好的错误提示
5. **国际化**: 所有UI文本支持中英文切换

## 环境变量配置

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

# 短信服务（可选）
SMS_API_KEY=your_sms_api_key
SMS_SECRET=your_sms_secret

# AI服务（保持现有）
MIMO_KEY=tp-stjygn6w8myoh5z7nve6rti23b1clwi9jp46frk3nld9ahwy
BOCHA_KEY=sk-77d284097eff496db8c11ecc7ef22b90
```