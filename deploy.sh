#!/bin/bash
# ============================================
# rn-ai-chat Docker 部署脚本
# 在 Ubuntu 服务器上执行
# ============================================

set -e

PROJECT_DIR="/opt/rn-ai-chat"
GITHUB_REPO="https://github.com/wenlingyv/rn-ai-chat.git"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== rn-ai-chat Docker 部署脚本 ===${NC}"

# ============================================
# 1. 安装 Docker（如未安装）
# ============================================
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[1/6] 正在安装 Docker...${NC}"
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
    usermod -aG docker $USER
    echo -e "${GREEN}Docker 安装完成${NC}"
else
    echo -e "${GREEN}[1/6] Docker 已安装: $(docker --version)${NC}"
fi

# ============================================
# 2. 安装 Docker Compose 插件
# ============================================
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}[2/6] 正在安装 Docker Compose...${NC}"
    apt-get update && apt-get install -y docker-compose-plugin
    echo -e "${GREEN}Docker Compose 安装完成${NC}"
else
    echo -e "${GREEN}[2/6] Docker Compose 已安装: $(docker compose version)${NC}"
fi

# ============================================
# 3. 克隆/更新项目代码
# ============================================
echo -e "${YELLOW}[3/6] 准备项目代码...${NC}"
if [ -d "$PROJECT_DIR/.git" ]; then
    cd "$PROJECT_DIR"
    git pull origin main
    echo -e "${GREEN}代码已更新${NC}"
else
    rm -rf "$PROJECT_DIR"
    git clone "$GITHUB_REPO" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    echo -e "${GREEN}代码已克隆${NC}"
fi

# ============================================
# 4. 创建环境变量文件
# ============================================
echo -e "${YELLOW}[4/6] 检查环境变量配置...${NC}"
if [ ! -f "$PROJECT_DIR/.env" ]; then
    cat > "$PROJECT_DIR/.env" << 'EOF'
# ============================================
# rn-ai-chat 环境变量配置
# ============================================

# 数据库配置
DB_USER=postgres
DB_PASSWORD=YourStrongPassword123
DB_NAME=ai_chat
DB_HOST=postgres
DB_PORT=5432

# DeepSeek API Key
DEEPSEEK_API_KEY=sk-your-key-here
EOF
    echo -e "${RED}⚠️  .env 文件已创建，请编辑配置正确的密码和 API Key:${NC}"
    echo -e "${YELLOW}   nano $PROJECT_DIR/.env${NC}"
    echo -e "${RED}   修改后重新运行此脚本${NC}"
    exit 1
fi

# 加载环境变量
set -a
source "$PROJECT_DIR/.env"
set +a

echo -e "${GREEN}环境变量已加载${NC}"

# ============================================
# 5. 构建并启动容器
# ============================================
echo -e "${YELLOW}[5/6] 构建 Docker 镜像并启动服务...${NC}"
cd "$PROJECT_DIR"
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

echo -e "${GREEN}容器启动完成${NC}"

# ============================================
# 6. 等待并检查状态
# ============================================
echo -e "${YELLOW}[6/6] 等待服务就绪...${NC}"
sleep 5

# 检查容器状态
if docker compose ps | grep -q "Up"; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ 部署成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "API 地址: http://$(curl -s ifconfig.me):5000"
    echo -e "容器状态:"
    docker compose ps
    echo -e ""
    echo -e "查看日志: ${YELLOW}docker compose logs -f${NC}"
    echo -e "停止服务: ${YELLOW}docker compose down${NC}"
else
    echo -e "${RED}❌ 部署可能出现问题，请检查日志:${NC}"
    echo -e "${YELLOW}docker compose logs${NC}"
    exit 1
fi
