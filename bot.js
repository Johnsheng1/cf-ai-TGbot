// bot.js

// 导入必要的库
require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const { marked } = require('marked'); // <-- 新增：导入 marked 库

// 从 .env 文件中读取配置
const { 
    BOT_TOKEN, 
    CLOUDFLARE_API_TOKEN, 
    CLOUDFLARE_ACCOUNT_ID, 
    CLOUDFLARE_GATEWAY_NAME 
} = process.env;

// --- 在这里设置你的自定义配置 ---
const PRESET_PROMPT = {
    role: 'system',
    content: "你是一个乐于助人、知识渊博的 AI 助手。你的回答应该清晰、简洁，并始终保持友好。请使用中文回答，并适当使用 Markdown 语法来增强可读性 (例如 **加粗**、`代码`、*斜体* 等)。"
};

const ALLOWED_MODELS = {
    'llama3': 'workers-ai/@cf/meta/llama-3-8b-instruct',
    'mistral': 'workers-ai/@cf/mistral/mistral-7b-instruct-v0.1',
    'qwq-32b': 'workers-ai/@cf/qwen/qwq-32b',
    'qwen1.5-1.8b-chat': 'workers-ai/@cf/qwen/qwen1.5-1.8b-chat',
};

let currentModel = ALLOWED_MODELS['llama3'];
const DEFAULT_MODEL_NAME = 'llama3';
const MAX_CONTEXT_MESSAGES = 12;

// --- 配置结束 ---

// 检查环境变量
if (!BOT_TOKEN || !CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_GATEWAY_NAME) {
    console.error("错误：请确保 .env 文件中已设置所有必需的变量。");
    process.exit(1);
}

// 初始化 Telegraf Bot
const bot = new Telegraf(BOT_TOKEN);
const conversationHistory = new Map();
const gatewayBaseUrl = `https://gateway.ai.cloudflare.com/v1/${CLOUDFLARE_ACCOUNT_ID}/${CLOUDFLARE_GATEWAY_NAME}`;


// =================================================================
// ============== 新增：Markdown 转 Telegram HTML 函数 ==============
// =================================================================
function markdownToTelegramHtml(markdownText) {
    if (!markdownText) return '';

    // 使用 marked 将 markdown 转换为 html
    let html = marked(markdownText, {
        gfm: true, // 启用 GitHub Flavored Markdown
        breaks: true, // 将换行符转换为 <br>
    });

    // Telegram HTML 支持的标签: <b>, <i>, <u>, <s>, <code>, <pre>, <a>
    // marked 会生成 <p>, <ul>, <li> 等，我们需要进行一些替换来适应 Telegram

    // 将代码块 <pre><code>...</code></pre> 转换为 Telegram 的 <pre>...</pre>
    // 注意：要处理语言类，例如 <pre><code class="language-python">
    html = html.replace(/<pre><code(?: class="language-(.*?)")?>/g, '<pre>').replace(/<\/code><\/pre>/g, '</pre>');

    // 移除 <p> 标签，它们在 Telegram 中通常是不必要的
    html = html.replace(/<p>/g, '').replace(/<\/p>/g, '\n');

    // 将 <strong> 转换为 <b>
    html = html.replace(/<strong>/g, '<b>').replace(/<\/strong>/g, '</b>');
    // 将 <em> 转换为 <i>
    html = html.replace(/<em>/g, '<i>').replace(/<\/em>/g, '</i>');

    // 简单地处理列表，将 <li> 转换为 •
    html = html.replace(/<ul>/g, '').replace(/<\/ul>/g, '');
    html = html.replace(/<ol>/g, '').replace(/<\/ol>/g, '');
    html = html.replace(/<li>/g, '• ').replace(/<\/li>/g, '\n');

    // 移除所有其他不支持的 HTML 标签，防止 API 错误
    html = html.replace(/<(?!\/?(b|i|u|s|code|pre|a|br)\s*[^>]*>)[^>]+>/g, '');

    return html.trim();
}


async function getAiResponse(history, modelPath) {
    const fullUrl = `${gatewayBaseUrl}/${modelPath}`;
    console.log(`向模型 [${modelPath}] 发送请求...`);
    
    try {
        const response = await axios.post(
            fullUrl, { messages: history }, {
                headers: {
                    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const aiMessage = response.data.result.response || response.data.choices[0].message.content;
        return aiMessage.trim();
    } catch (error) {
        console.error("调用 AI Gateway 时出错:", error.response ? error.response.data : error.message);
        return "糟糕，我好像遇到了一点技术问题，稍后再试试吧。";
    }
}

// 命令: /start
bot.start((ctx) => ctx.reply('你好！我已经准备好了。发送 /help 查看所有可用命令。'));

// =====================================================
// ================== 新增：/help 命令 ==================
// =====================================================
bot.command('help', (ctx) => {
    const helpMessage = `
<b>你好！我是您的 AI 助手。</b>

您可以通过以下方式与我互动：
• 在群组中 <b>@我</b> 然后提问。
• 直接<b>回复</b>我的任何一条消息。

<b>可用命令列表:</b>
/help - 显示这条帮助信息。
/clear - 清空当前对话的上下文记忆，开始一个新话题。
/setmodel <code>[模型名称]</code> - 切换使用的 AI 模型。

<b>模型切换示例:</b>
<code>/setmodel llama3</code>

祝您使用愉快！
    `;
    // 使用 parse_mode: 'HTML' 来发送格式化消息
    ctx.replyWithHTML(helpMessage);
});


// 命令: /clear
bot.command('clear', (ctx) => {
    const chatId = ctx.chat.id;
    if (conversationHistory.has(chatId)) {
        conversationHistory.delete(chatId);
        console.log(`已清空群组 [${chatId}] 的对话历史。`);
        ctx.reply('好的，我们来重新开始吧！我已经忘记了我们之前聊过什么。');
    } else {
        ctx.reply('我们还没开始聊呢，现在就可以开始！');
    }
});

// 命令: /setmodel [model_name]
bot.command('setmodel', (ctx) => {
    const modelName = ctx.message.text.split(' ')[1];

    if (!modelName) {
        const availableModels = Object.keys(ALLOWED_MODELS).map(m => `<code>${m}</code>`).join(', ');
        const currentModelName = Object.keys(ALLOWED_MODELS).find(key => ALLOWED_MODELS[key] === currentModel) || '未知';
        const message = `
请提供一个模型名称。

<b>当前模型:</b> <code>${currentModelName}</code>
<b>可用模型:</b> ${availableModels}
        `;
        ctx.replyWithHTML(message); // <-- 更新：使用 HTML 回复
        return;
    }

    if (ALLOWED_MODELS[modelName]) {
        currentModel = ALLOWED_MODELS[modelName];
        console.log(`全局 AI 模型已切换为: ${modelName} (${currentModel})`);
        ctx.replyWithHTML(`✅ 好的，AI 模型已切换为: <b>${modelName}</b>`); // <-- 更新：使用 HTML 回复
    } else {
        const availableModels = Object.keys(ALLOWED_MODELS).map(m => `<code>${m}</code>`).join(', ');
        ctx.replyWithHTML(`❌ 无效的模型名称。\n<b>可用模型:</b> ${availableModels}`); // <-- 更新：使用 HTML 回复
    }
});

// 监听文本消息
bot.on('text', async (ctx) => {
    const messageText = ctx.message.text;
    const chatId = ctx.chat.id;
    const botUsername = `@${ctx.botInfo.username}`;
    
    const isReplyToBot = ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo.id;
    const isMentioningBot = messageText.includes(botUsername);

    if (isReplyToBot || isMentioningBot) {
        console.log(`在群组 [${chatId}] 中被触发。`);
        
        const thinkingMessage = await ctx.reply('思考中...', { reply_to_message_id: ctx.message.message_id });

        if (!conversationHistory.has(chatId)) {
            conversationHistory.set(chatId, [PRESET_PROMPT]);
        }
        const chatHistory = conversationHistory.get(chatId);

        const cleanMessage = messageText.replace(botUsername, '').trim();
        chatHistory.push({ role: 'user', content: cleanMessage });

        while (chatHistory.length > MAX_CONTEXT_MESSAGES + 1) { chatHistory.splice(1, 1); }

        const aiResponse = await getAiResponse(chatHistory, currentModel);
        chatHistory.push({ role: 'assistant', content: aiResponse });

        // =====================================================
        // ================ 更新：发送 HTML 格式回复 ================
        // =====================================================
        const htmlResponse = markdownToTelegramHtml(aiResponse);

        // 使用 editMessageText 并设置 parse_mode 为 'HTML'
        ctx.telegram.editMessageText(
            chatId, 
            thinkingMessage.message_id, 
            null, 
            htmlResponse, 
            { parse_mode: 'HTML' }
        ).catch(err => {
            // 如果 HTML 解析失败，则发送纯文本作为备用
            console.error("HTML 解析失败:", err.message);
            ctx.telegram.editMessageText(chatId, thinkingMessage.message_id, null, aiResponse);
        });
    }
});

// 启动机器人
bot.launch().then(() => {
    console.log(`Telegram Bot 已启动，默认模型: ${DEFAULT_MODEL_NAME}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
