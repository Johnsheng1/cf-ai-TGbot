# CF-ai-TGbot
# 请帮我点上Star✨，你的支持是对我最大的鼓励
这是一个功能强大、可高度自定义的 Telegram 机器人，由 Node.js 驱动。它通过 Cloudflare AI Gateway 连接到各种大语言模型 (LLM)，实现了智能、带有上下文记忆的连续对话功能。

DEMO：https://t.me/CFAIFreeTGbot

---

## ✨ 核心特性

*   **⚡️ Cloudflare AI Gateway 集成**: 所有 AI 请求都通过 Cloudflare 进行路由，方便你进行日志记录、分析和缓存，同时保护你的后端 AI 提供商密钥。
*   **🧠 上下文对话记忆**: 机器人能够记住在群组中的对话历史，实现流畅的连续问答。记忆长度可控，以防止超出模型限制。
*   **🤖 动态模型切换**: 只需一条简单的命令 (`/setmodel`)，即可在多个预设的 AI 模型之间（如 Llama 3, Mistral 等）动态切换。
*   **🎨 优雅的格式化回复**: 自动将 AI 生成的 Markdown 文本转换为 Telegram 支持的 HTML 格式，完美显示代码块、加粗、斜体和列表。
*   **🎯 智能触发机制**: 机器人不会干扰群组正常聊天。它只会在被 **@提及** 或 **回复** 其消息时才会被激活。
*   **🛠️ 完整的命令支持**: 内置 `/start`, `/help`, `/clear` 和 `/setmodel` 等实用命令，方便用户使用和管理。
*   **🚀 易于部署**: 使用 Node.js 和 PM2，可以轻松地在任何 VPS 上实现 7x24 小时稳定运行。
*   应用实例（screenshots）
*   ![6VN0BedfMx69PpBn5U1qS8LHMJGnbxyE.webp](https://cdn.nodeimage.com/i/6VN0BedfMx69PpBn5U1qS8LHMJGnbxyE.webp)
*   ![ZWhAFJFTylEOEkgY2a4nWqtaebkCDyl3.webp](https://cdn.nodeimage.com/i/ZWhAFJFTylEOEkgY2a4nWqtaebkCDyl3.webp)

---

## 🔧 环境准备 (Prerequisites)

在开始部署之前，请确保你已拥有以下所有条件：

1.  **Telegram Bot Token**: 从 Telegram 的 [@BotFather](https://t.me/BotFather) 创建机器人后获得。
2.  **Cloudflare 账户凭证**:
    *   `Account ID`
    *   `AI Gateway Name`
    *   `API Token` (具有 AI Gateway 读写权限)
    *   https://dash.cloudflare.com/profile/api-tokens
    *   单击创建令牌
    *   使用Workers AI 模板
    *   单击继续以显示摘要
    *   单击创建令牌
    *   复制您的令牌，设置环境变量

3.  **一台 VPS 服务器**: 推荐使用 Ubuntu 或 Debian 系统。
4.  **Node.js**: 推荐 v18 或更高版本 (教程中使用 `nvm` 进行安装)。
5.  **Git**: 用于从代码仓库克隆项目。

---

## 🚀 部署教程 (Deployment)

按照以下步骤在你的 VPS 上从零开始部署此机器人。

### 1. 安装基础环境

首先，安装 Node.js (通过 nvm) 和 Git。

```bash


# 安装 nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# 安装最新的 Node.js LTS 版本
nvm install --lts


```

### 2. 克隆项目并配置

将本项目的代码克隆到你的服务器,并进入项目目录

```bash

# 安装所有依赖库
npm install
```

### 3. 配置环境变量

将环境变量填入.env

### 4. 使用 PM2 启动并持久化运行

我们将使用 `PM2` 来管理我们的 Node.js 进程，确保它能在后台持续运行并在崩溃后自动重启。

```bash
# 全局安装 PM2
npm install pm2 -g

# 使用 PM2 启动机器人，并给它一个名字
pm2 start bot.js --name "telegram-bot"

# 设置 PM2 开机自启 (它会生成一条命令，复制并运行它)
pm2 startup

# 保存当前进程列表，以便重启后恢复
pm2 save
```

至此，你的机器人已成功部署并开始 7x24 小时运行！

你可以使用以下 `pm2` 命令来管理你的机器人：
*   `pm2 list`: 查看所有正在运行的应用的状态。
*   `pm2 logs telegram-bot`: 查看机器人的实时日志（用于排错）。
*   `pm2 restart telegram-bot`: 重启机器人（例如更新代码后）。
*   `pm2 stop telegram-bot`: 停止机器人。

---

## 💬 如何使用 (Bot Usage)

将机器人添加到你的 Telegram 群组并设为管理员后，你可以：

*   **开始对话**: 发送 `/start` 或 `/help` 查看欢迎和帮助信息。
*   **与 AI 聊天**:
    *   在群组中发送消息并 **@你的机器人名字** (例如: `@MyAIBot 为什么天空是蓝色的？`)。
    *   **回复** 机器人的任何一条消息继续对话。
*   **切换 AI 模型**:
    *   发送 `/setmodel [模型名称]`。
    *   例如: `/setmodel gpt4o-mini`。
    *   不带参数发送 `/setmodel` 可以查看当前和所有可用模型。
*   **清空对话记忆**:
    *   当你想要开始一个全新的话题时，发送 `/clear` 命令。

---

## ⚙️ 自定义你的机器人 (Customization)

你可以通过修改 `bot.js` 文件头部的配置区域来轻松自定义机器人的行为。

*   `PRESET_PROMPT`: 修改这里的文本来改变 AI 的“人设”和回答风格。
*   `ALLOWED_MODELS`: 在这里添加、删除或修改可用的 AI 模型列表。键是用户输入的命令，值是 Cloudflare 的模型路径。
*   `MAX_CONTEXT_MESSAGES`: 调整上下文记忆的消息数量。数字越大，记忆越长，但成本和延迟也可能更高。

---


## 📜 许可证 (License)

[MIT](https://choosealicense.com/licenses/mit/)
