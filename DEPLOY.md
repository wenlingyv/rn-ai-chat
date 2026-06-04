# rn-ai-chat Docker 容器化部署指南

服务器：`123.57.3.168`（Ubuntu 22.04，2核 2G）

---

## 前置检查

### 1. 开放安全组端口

在华为云控制台 → 安全组 → 入方向规则，添加：

| 协议 | 端口 | 源地址 | 说明 |
|------|------|--------|------|
| TCP | 5000 | 0.0.0.0/0 | API 服务端口 |
| TCP | 5432 | 0.0.0.0/0 | PostgreSQL 端口（可选，生产环境建议只开放内网） |

### 2. SSH 连接服务器

```bash
ssh root@123.57.3.168
```

---

## 部署步骤

### 步骤 1：安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动并设置开机自启
systemctl enable docker
systemctl start docker

# 验证
docker --version
```

### 步骤 2：安装 Docker Compose

```bash
apt-get update
apt-get install -y docker-compose-plugin

# 验证
docker compose version
```

### 步骤 3：克隆项目代码

```bash
cd /opt
git clone https://github.com/wenlingyv/rn-ai-chat.git
cd rn-ai-chat
```

### 步骤 4：创建环境变量文件

```bash
cp .env.example .env
nano .env
```

**必须修改的配置：**

```env
# 数据库密码（务必改成强密码）
DB_PASSWORD=YourStrongPassword123

# DeepSeek API Key（AI 对话功能必需）
DEEPSEEK_API_KEY=sk-your-actual-key-here
```

> 如果不需要 AI 对话功能，可以保留一个占位值，但相关接口会报错。

### 步骤 5：启动容器

```bash
# 构建镜像并启动（首次需要下载镜像，约 3-5 分钟）
docker compose up -d --build

# 查看日志
docker compose logs -f
```

### 步骤 6：验证部署

```bash
# 查看容器状态
docker compose ps

# 测试 API 接口
curl http://localhost:5000/api/health
# 应返回: {"status":"ok","message":"AI Chat Server is running"}
```

公网测试：浏览器访问 `http://123.57.3.168:5000/api/health`

---

## 常用运维命令

```bash
# 查看日志
docker compose logs -f

# 查看服务端日志
docker compose logs -f server

# 查看数据库日志
docker compose logs -f postgres

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 完全重置（删除数据卷，谨慎使用）
docker compose down -v

# 进入数据库容器执行 SQL
docker exec -it rn-ai-chat-db psql -U postgres -d ai_chat

# 查看容器资源占用
docker stats
```

---

## ⚠️ 重要提醒

### 内存限制（2GB 服务器）

部署后请监控内存，如果内存不足：

```bash
# 查看内存使用
free -h

# 如果内存紧张，可以限制容器内存（已在 docker-compose.yml 中设置）
# 也可添加 swap 分区
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 移动端连接地址

客户端需要把 API 地址从 `192.168.x.x` 改为服务器公网 IP：

```
http://123.57.3.168:5000
```

修改位置：`client/screens/AIChatScreen.js`、`client/screens/LoginScreen.js` 等文件中的 API 地址。

### 数据库持久化

PostgreSQL 数据通过 Docker Volume `postgres_data` 持久化，即使容器删除数据也不会丢失。数据存储在：

```
/var/lib/docker/volumes/rn-ai-chat_postgres_data/
```

---

## 文件清单（本次提交）

| 文件 | 说明 |
|------|------|
| `server/Dockerfile` | Node.js 服务端镜像构建 |
| `docker-compose.yml` | 编排 PostgreSQL + Node.js |
| `server/.dockerignore` | 排除不需要打包的文件 |
| `deploy.sh` | 一键部署脚本 |
| `.env.example` | 环境变量模板 |
| `server/index.js` | 添加 dotenv 加载，端口支持环境变量 |
| `server/database/index.js` | 数据库配置改为环境变量 |
| `server/database/migrate.js` | 迁移脚本数据库配置改为环境变量 |
