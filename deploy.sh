#!/bin/bash

# ==============================================================================
#  cf-ai-TGbot Docker 一键交互式部署脚本
#
# --- 配置 ---
# Docker 镜像和容器名称
IMAGE_NAME="ghcr.io/johnsheng1/cf-ai-tgbot:latest"
CONTAINER_NAME="cf-ai-tgbot"

# --- 颜色定义 ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- 脚本开始 ---
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  欢迎使用 cf-ai-TGbot Docker 部署向导  ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo

# 1. 检查 Docker 是否安装并运行
echo -e "${YELLOW}Step 1: 检查 Docker 环境...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: 未找到 Docker。请先安装 Docker。${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 守护进程未运行。请启动 Docker 服务。${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 环境正常。${NC}"
echo

# 2. 检查并处理已存在的同名容器
echo -e "${YELLOW}Step 2: 检查旧容器...${NC}"
if [ "$(docker ps -a -q -f name=^/${CONTAINER_NAME}$)" ]; then
    echo "发现已存在的容器 '${CONTAINER_NAME}'，将停止并移除它以便更新..."
    docker stop ${CONTAINER_NAME} > /dev/null
    docker rm ${CONTAINER_NAME} > /dev/null
    echo -e "${GREEN}✅ 旧容器已移除。${NC}"
else
    echo -e "未发现旧容器，将进行全新部署。"
fi
echo

# 3. 拉取最新的 Docker 镜像
echo -e "${YELLOW}Step 3: 拉取最新的 Docker 镜像 (${IMAGE_NAME})...${NC}"
if docker pull ${IMAGE_NAME}; then
    echo -e "${GREEN}✅ 最新镜像拉取成功。${NC}"
else
    echo -e "${RED}错误: 镜像拉取失败。请检查网络或镜像名称。${NC}"
    exit 1
fi
echo

# 4. 交互式获取环境变量
echo -e "${YELLOW}Step 4: 请输入您的机器人配置 (输入时不会显示):${NC}"

# 定义一个函数来安全地读取变量
read_secret() {
    local prompt="$1"
    local var_name="$2"
    local value=""
    # -s: silent mode (不回显)
    # -p: prompt
    read -s -p "$prompt" value
    echo # 换行
    if [ -z "$value" ]; then
        echo -e "${RED}错误: 此项不能为空！脚本已中止。${NC}"
        exit 1
    fi
    # 使用 eval 动态赋值给传入的变量名
    eval "$var_name='$value'"
}

read_secret "请输入您的 BOT_TOKEN: " BOT_TOKEN
read_secret "请输入您的 CLOUDFLARE_API_TOKEN: " CLOUDFLARE_API_TOKEN
read_secret "请输入您的 CLOUDFLARE_ACCOUNT_ID: " CLOUDFLARE_ACCOUNT_ID
read_secret "请输入您的 CLOUDFLARE_GATEWAY_NAME: " CLOUDFLARE_GATEWAY_NAME

echo -e "${GREEN}✅ 所有配置已输入。${NC}"
echo

# 5. 部署 Docker 容器
echo -e "${YELLOW}Step 5: 部署容器 '${CONTAINER_NAME}'...${NC}"

docker run -d \
  --name ${CONTAINER_NAME} \
  --restart always \
  -e BOT_TOKEN="${BOT_TOKEN}" \
  -e CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}" \
  -e CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID}" \
  -e CLOUDFLARE_GATEWAY_NAME="${CLOUDFLARE_GATEWAY_NAME}" \
  ${IMAGE_NAME}

# 6. 检查部署结果
if [ $? -eq 0 ]; then
    echo -e "${GREEN}======================================================${NC}"
    echo -e "${GREEN}🎉 恭喜！部署成功！ 🎉${NC}"
    echo
    echo -e "您的 Telegram AI 机器人现在正在后台运行。"
    echo -e "您可以使用以下命令管理您的机器人:"
    echo -e "  - 查看日志: ${YELLOW}docker logs ${CONTAINER_NAME}${NC}"
    echo -e "  - 停止运行: ${YELLOW}docker stop ${CONTAINER_NAME}${NC}"
    echo -e "  - 重新启动: ${YELLOW}docker start ${CONTAINER_NAME}${NC}"
    echo -e "${GREEN}======================================================${NC}"
else
    echo -e "${RED}======================================================${NC}"
    echo -e "${RED}❌ 部署失败。请检查以上日志输出以排查问题。${NC}"
    echo -e "${RED}======================================================${NC}"
    exit 1
fi

exit 0
