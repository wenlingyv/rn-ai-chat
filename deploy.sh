#!/bin/bash
# ============================================
# rn-ai-chat 阿里云 Ubuntu 一键部署脚本
# 使用方法: bash deploy.sh
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_DIR="/opt/rn-ai-chat"
GITHUB_REPO="https://github.com/wenlingyv/rn-ai-chat.git"

# ============================================
# 第一步：安装 Docker
# ============================================
echo ""
print_info "========== 第一步：安装 Docker =========="

if command -v docker &> /dev/null; then
    print_warn "Docker 已安装，跳过"
else
    print_info "正在安装 Docker..."
    sudo apt update
    sudo apt install -y ca-certificates curl gnupg lsb-release

    # 添加 Docker 官方 GPG key（使用阿里云镜像加速）
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # 添加 Docker 源
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # 将当前用户加入 docker 组
    sudo usermod -aG docker $USER
    print_success "Docker 安装完成"
fi

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# ============================================
# 第二步：配置 Docker 镜像加速
# ============================================
echo ""
print_info "========== 第二步：配置 Docker 镜像加速 =========="

sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerhub.azk8s.cn",
    "https://registry.docker-cn.com"
  ]
}
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
print_success "Docker 镜像加速配置完成"

# ============================================
# 第三步：克隆项目
# ============================================
echo ""
print_info "========== 第三步：克隆项目 =========="

if [ -d "$PROJECT_DIR/.git" ]; then
    print_warn "项目目录已存在，拉取最新代码..."
    cd $PROJECT_DIR
    git pull origin main
else
    print_info "正在克隆项目..."
    cd /opt
    git clone $GITHUB_REPO
    cd rn-ai-chat
fi

print_success "项目代码已就绪"

# ============================================
# 第四步：配置环境变量
# ============================================
echo ""
print_info "========== 第四步：配置环境变量 =========="

cd $PROJECT_DIR

if [ -f ".env" ]; then
    print_warn ".env 文件已存在，跳过（如需修改请手动编辑 $PROJECT_DIR/.env）"
else
    print_warn "请配置环境变量..."

    # 交互式输入
    echo ""
    echo -e "${YELLOW}请输入以下信息（直接回车使用默认值）：${NC}"
    echo ""

    read -p "数据库密码 [默认: 123456]: " DB_PASSWORD
    DB_PASSWORD=${DB_PASSWORD:-123456}

    read -p "DEEPSEEK_API_KEY: " DEEPSEEK_API_KEY
    read -p "MIMO_KEY: " MIMO_KEY
    read -p "BOCHA_KEY: " BOCHA_KEY
    read -p "ZHIPU_API_KEY: " ZHIPU_API_KEY

    # 生成随机 JWT 密钥
    ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
    REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)

    cat > .env << EOF
# 数据库
DB_USER=postgres
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=ai_chat

# AI 服务 API Keys
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
MIMO_KEY=${MIMO_KEY}
BOCHA_KEY=${BOCHA_KEY}
ZHIPU_API_KEY=${ZHIPU_API_KEY}

# JWT 密钥（自动生成）
ACCESS_TOKEN_SECRET=${ACCESS_TOKEN_SECRET}
REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}
EOF

    print_success "环境变量配置完成"
fi

# ============================================
# 第五步：构建并启动
# ============================================
echo ""
print_info "========== 第五步：构建并启动服务 =========="

print_info "正在构建 Docker 镜像（首次约 3-5 分钟）..."
docker compose down 2>/dev/null || true
docker compose up -d --build

print_success "服务启动完成！"

# ============================================
# 第六步：验证
# ============================================
echo ""
print_info "========== 第六步：验证服务 =========="

sleep 8

echo ""
print_info "容器状态："
docker compose ps

echo ""
print_info "健康检查..."

# 检查服务端
HEALTH=$(curl -s http://localhost/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "ok"; then
    print_success "服务端运行正常 ✅"
else
    print_warn "服务端可能还在启动中，等待 10 秒后重试..."
    sleep 10
    HEALTH=$(curl -s http://localhost/api/health 2>/dev/null)
    if echo "$HEALTH" | grep -q "ok"; then
        print_success "服务端运行正常 ✅"
    else
        print_warn "服务端启动较慢，请稍后手动检查"
    fi
fi

# 检查前端
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    print_success "前端页面可访问 ✅"
else
    print_warn "前端可能还在启动中，请稍后重试"
fi

# ============================================
# 完成
# ============================================
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "你的服务器IP")

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  访问地址: ${BLUE}http://${SERVER_IP}${NC}"
echo ""
echo -e "  管理命令："
echo -e "    查看状态: ${YELLOW}docker compose ps${NC}"
echo -e "    查看日志: ${YELLOW}docker compose logs -f${NC}"
echo -e "    重启服务: ${YELLOW}docker compose restart${NC}"
echo -e "    停止服务: ${YELLOW}docker compose down${NC}"
echo -e "    重新部署: ${YELLOW}docker compose up -d --build${NC}"
echo ""
echo -e "  数据库备份: ${YELLOW}docker exec rn-ai-chat-db pg_dump -U postgres ai_chat > backup.sql${NC}"
echo ""
