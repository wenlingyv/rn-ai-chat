# ============================================
# Expo Web 构建 — 多阶段构建
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm install

# 复制源码
COPY . .

# 修复所有 bin 目录权限并构建 Web 版本
RUN chmod -R +x node_modules/.bin/ 2>/dev/null || true
RUN npx expo export --platform web

# ============================================
# 产出阶段
# ============================================
FROM nginx:alpine

# 从 builder 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
