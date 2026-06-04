# 生产环境修复与部署手册

> 适用场景：本地正常、上线后 AI 对话 / 实时消息 / 语音全部失效

---

## 一、根本原因总结

| # | 问题 | 位置 | 现象 |
|---|------|------|------|
| 1 | **Nginx 只监听 80，没有 443/SSL** | `nginx/nginx.conf` | HTTPS 页面所有请求 404/拒绝 |
| 2 | **WebSocket 没有 wss:// 支持** | `nginx/nginx.conf` | `ws://` 在 HTTPS 页面被浏览器拒绝（Mixed Content）|
| 3 | **docker-compose 没有映射 443 端口** | `docker-compose.yml` | 443 流量根本进不了容器 |
| 4 | **CORS 使用 `cors()` 无参数（通配符）** | `server/index.js` | 带 credentials 的请求被浏览器拦截 |
| 5 | **API Key 硬编码在代码里** | `server/index.js` | Key 泄露风险，且 env 未配置时走硬编码旧 key 导致鉴权失败 |

---

## 二、已修复的文件

- `nginx/nginx.conf` — 新增 HTTPS 443 server block + WSS 支持 + HTTP→HTTPS 跳转
- `docker-compose.yml` — 新增 443:443 端口映射 + SSL 证书目录挂载
- `server/index.js` — CORS 改为读取 `CORS_ORIGIN` 环境变量 + 移除硬编码 API Key
- `.env.example` — 新增 `CORS_ORIGIN` 配置项说明

---

## 三、服务器操作步骤

### 第 1 步：准备 SSL 证书

```bash
# 在服务器上创建证书目录
mkdir -p /etc/ssl/rn-ai-chat

# 将你的证书文件上传到该目录（文件名必须完全一致）：
# /etc/ssl/rn-ai-chat/fullchain.pem   （完整证书链）
# /etc/ssl/rn-ai-chat/privkey.pem     （私钥）

# 如果使用 Let's Encrypt，通常证书在：
# /etc/letsencrypt/live/你的域名/fullchain.pem
# /etc/letsencrypt/live/你的域名/privkey.pem
# 可以直接软链或复制过去：
cp /etc/letsencrypt/live/你的域名/fullchain.pem /etc/ssl/rn-ai-chat/fullchain.pem
cp /etc/letsencrypt/live/你的域名/privkey.pem   /etc/ssl/rn-ai-chat/privkey.pem
chmod 600 /etc/ssl/rn-ai-chat/privkey.pem
```

### 第 2 步：更新 .env 文件

```bash
# 进入项目目录
cd /你的项目路径

# 编辑 .env，填写所有真实值
nano .env
```

**必填项（缺少任何一项会导致对应功能失效）：**

```bash
# AI 服务 Key
MIMO_KEY=你的真实MIMO_KEY
BOCHA_KEY=你的真实BOCHA_KEY
ZHIPU_API_KEY=你的真实智谱KEY

# JWT（必须修改，否则 token 可被伪造）
ACCESS_TOKEN_SECRET=至少32位随机字符串
REFRESH_TOKEN_SECRET=至少32位随机字符串

# CORS（填写你的域名，多个逗号分隔）
CORS_ORIGIN=https://你的域名.com
```

### 第 3 步：阿里云安全组放行 443 端口

在阿里云 ECS 控制台：
- 实例详情 → 安全组 → 配置规则
- 入方向 → 添加规则：协议 TCP，端口 443，来源 0.0.0.0/0

### 第 4 步：重新拉取代码并重建容器

```bash
# 拉取代码（代码已经在本地修改好并推送后执行）
git pull

# 完全重建（--no-cache 确保 nginx.conf 更新生效）
docker compose down
docker compose build --no-cache nginx server
docker compose up -d

# 查看启动日志
docker compose logs -f --tail=50
```

---

## 四、验证清单

### 验证 1：HTTPS 可访问
```bash
curl -I https://你的域名.com
# 期望：HTTP/2 200 或 301
```

### 验证 2：API 可用
```bash
curl https://你的域名.com/api/health
# 期望：{"status":"ok","message":"AI Chat Server is running"}
```

### 验证 3：WebSocket 可升级
```bash
# 安装 wscat
npm install -g wscat

# 测试聊天 WebSocket（用真实 token 替换）
wscat -c "wss://你的域名.com/ws?token=你的accessToken"
# 期望：Connected (press CTRL+C to quit)
```

### 验证 4：语音 WebSocket 可升级
```bash
wscat -c "wss://你的域名.com/api/realtime/ws"
# 期望：Connected（服务端会等前端发 session.create）
```

### 验证 5：查看服务器日志
```bash
# 查看 Nginx 错误日志
docker compose logs nginx

# 查看 Node.js 服务日志
docker compose logs server

# 应该能看到：
# ✅ 已连接智谱 GLM-Realtime（语音连接成功）
# ✅ WebSocket token 验证成功（聊天连接成功）
```

---

## 五、常见问题排查

### Q：证书没有，怎么办？
使用 Let's Encrypt 免费签发：
```bash
apt install certbot
certbot certonly --standalone -d 你的域名.com
# 证书会自动保存到 /etc/letsencrypt/live/你的域名/
```

### Q：没有域名，只有 IP？
HTTPS 需要域名，没有域名的情况下：
- 开发/测试可以用 [自签证书](https://stackoverflow.com/a/10176685)（浏览器会警告）
- 或者考虑用 [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) 免费获得 HTTPS

### Q：容器启动后 Nginx 报 `certificate not found`？
检查证书路径是否正确：
```bash
ls -la /etc/ssl/rn-ai-chat/
# 应该有 fullchain.pem 和 privkey.pem
```

### Q：WebSocket 一直断开重连？
```bash
# 检查 nginx 超时配置（已设置 3600s，应该够用）
# 检查阿里云安全组是否有 idle timeout，通常是 900s
# 心跳已配置每 45 秒发一次，足以保活
```

---

## 六、架构说明（修复后）

```
手机 App / 浏览器
      │
      │ HTTPS (443) / WSS (443)
      ▼
  Nginx 容器
  ├─ /           → 静态文件（Expo Web）
  ├─ /api/*      → Node.js 服务 (HTTP)
  ├─ /ws         → Node.js WebSocket (聊天)
  └─ /api/realtime/ws → Node.js WebSocket (语音代理)
                              │
                              │ WSS
                              ▼
                     智谱 GLM-Realtime API
```
