# --- Stage 1: Build Stage ---
# 使用一个包含 Node.js 和 Git 的 Alpine 镜像作为构建环境
# 这可以帮助我们保持最终镜像的纯净
FROM alpine:3.19 AS builder

# 安装构建所必需的依赖: Node.js, npm, 和 Git
# --no-cache 避免缓存包索引，保持镜像层小
RUN apk add --no-cache nodejs npm git

# 设置工作目录
WORKDIR /app

# 从你的 GitHub 仓库克隆代码
# 使用 --depth 1 只克隆最新的提交，减小体积
RUN git clone --depth 1 https://github.com/Johnsheng1/cf-ai-TGbot.git .

# 安装项目依赖
# 使用 --production 只安装生产环境必需的包，跳过 devDependencies
RUN npm install --production


# --- Stage 2: Production Stage ---
# 使用一个非常干净的、最小化的 Alpine 基础镜像
FROM alpine:3.19

# 再次安装运行所必需的依赖，这里不再需要 git
RUN apk add --no-cache nodejs npm tzdata

# 设置工作目录
WORKDIR /app

# 从构建阶段复制已经安装好依赖的整个应用
COPY --from=builder /app .

# (可选但推荐) 设置时区，有助于查看正确的日志时间
ENV TZ=Asia/Shanghai

# 创建一个非 root 用户来运行应用，增强安全性
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# 设置容器启动时执行的命令
# "npm start" 会执行 package.json 中定义的 "node bot.js"
CMD ["npm", "start"]
