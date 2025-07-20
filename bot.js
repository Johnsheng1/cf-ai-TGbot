// bot.js

// 导入必要的库
require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const { marked } = require('marked');

// 从 .env 文件中读取配置
const { 
    BOT_TOKEN, 
    CLOUDFLARE_API_TOKEN, 
    CLOUDFLARE_ACCOUNT_ID, 
    CLOUDFLARE_GATEWAY_NAME 
} = process.env;

// --- 全局默认配置 ---
const DEFAULT_PRESET_PROMPT = "你是一个乐于助人、知识渊博的 AI 助手。你的回答应该清晰、简洁，并始终保持友好。请使用中文回答，并适当使用 Markdown 语法来增强可读性。当你需要思考时，可以在回答前加入被<think></think>标签包裹的思考过程。";
const DEFAULT_MODEL = 'llama3';

const ALLOWED_MODELS = {
    'llama3': 'workers-ai/@cf/meta/llama-3-8b-instruct',
    'mistral': 'workers-ai/@cf/mistral/mistral-7b-instruct-v0.1',
    'qwq-32b': 'workers-ai/@cf/qwen/qwq-32b',
    'qwen1.5-1.8b-chat': 'workers-ai/@cf/qwen/qwen1.5-1.8b-chat',
};

const MAX_CONTEXT_MESSAGES = 12;
const THINK_TAG = '</think>';

// --- 配置结束 ---

// 检查环境变量
if (!BOT_TOKEN || !CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_GATEWAY_NAME) {
    console.error("错误：请确保 .env 文件中已设置所有必需的变量。");
    process.exit(1);
}

// 初始化 Bot 和数据存储
const bot = new Telegraf(BOT_TOKEN);
const conversationHistory = new Map(); // 存储对话历史
const chatSettings = new Map(); // <-- 新增：存储每个聊天的自定义设置
const gatewayBaseUrl = `https://gateway.ai.cloudflare.com/v1/${CLOUDFLARE_ACCOUNT_ID}/${CLOUDFLARE_GATEWAY_NAME}`;

// --- 辅助函数 ---

/**
 * 获取或创建指定聊天的设置，提供默认值
 * @param {number} chatId 
 * @returns {object} 该聊天的设置对象
 */
function getChatSettings(chatId) {
    if (!chatSettings.has(chatId)) {
        chatSettings.set(chatId, {
            showThink: false, // 默认不显示思考过程
            model: ALLOWED_MODELS[DEFAULT_MODEL], // 默认模型
            modelName: DEFAULT_MODEL,
            systemPrompt: DEFAULT_PRESET_PROMPT, // 默认背景
            keywords: [], // 默认没有关键词
        });
    }
    return chatSettings.get(chatId);
}

function markdownToTelegramHtml(markdownText) {
    if (!markdownText) return '';
    let html = marked(markdownText, { gfm: true, breaks: true });
    html = html.replace(/<pre><code(?: class=".*?")?>/g, '<pre>').replace(/<\/code><\/pre>/g, '</pre>');
    html = html.replace(/<p>/g, '').replace(/<\/p>/g, '\n');
    html = html.replace(/<strong>/g, '<b>').replace(/<\/strong>/g, '</b>');
    html = html.replace(/<em>/g, '<i>').replace(/<\/em>/g, '</i>');
    html = html.replace(/<ul>/g, '').replace(/<\/ul>/g, '');
    html = html.replace(/<ol>/g, '').replace(/<\/ol>/g, '');
    html = html.replace(/<li>/g, '• ').replace(/<\/li>/g, '\n');
    html = html.replace(/<(?!\/?(b|i|u|s|code|pre|a|br)\s*[^>]*>)[^>]+>/g, '');
    return html.trim();
}

async function getAiResponse(history, modelPath) {
    const fullUrl = `${gatewayBaseUrl}/${modelPath}`;
    console.log(`向模型 [${modelPath}] 发送请求...`);
    try {
        const response = await axios.post(fullUrl, { messages: history }, {
            headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' }
        });
        return (response.data.result.response || response.data.choices[0].message.content).trim();
    } catch (error) {
        console.error("调用 AI Gateway 时出错:", error.response ? error.response.data : error.message);
        return "糟糕，我好像遇到了一点技术问题，稍后再试试吧。";
    }
}

// --- 命令处理 ---

bot.start((ctx) => ctx.reply('你好！我已经准备好了。发送 /help 查看所有可用命令。'));

bot.command('help', (ctx) => {
    const helpMessage = `
<b>你好！我是您的可定制 AI 助手。</b>

<b>互动方式:</b>
• 在群组中 <b>@我</b> 或 <b>回复</b> 我的消息来对话。
• 使用 <code>/notice</code> 设置关键词，我会在群内检测并回应。

<b>可用命令 (所有设置针对当前聊天生效):</b>
/help - 显示这条帮助信息。
/clear - 清空当前对话的上下文记忆。
/reset - 清空当前对话的记忆和所有自定义设置。

<b>个性化设置:</b>
/background <code>[背景描述]</code> - 为我设置一个新的人设/背景。
/setmodel <code>[模型名称]</code> - 切换当前聊天使用的 AI 模型。
/showthink <code>[on|off]</code> - 是否显示我的思考过程。
/notice <code>[关键词1] [关键词2]...</code> - 设置需要我自动回应的关键词。使用 <code>/notice off</code> 关闭。

<b>请给我的GitHub项目点上star⭐，您的支持是我最大的动力</b>
<b>GitHub项目地址：https://github.com/Johnsheng1/cf-ai-TGbot</b>
祝您使用愉快！
    `;
    ctx.replyWithHTML(helpMessage);
});

// 新增：/showthink 命令
bot.command('showthink', (ctx) => {
    const settings = getChatSettings(ctx.chat.id);
    const arg = ctx.message.text.split(' ')[1];
    if (arg === 'on') {
        settings.showThink = true;
        ctx.replyWithHTML('好的，从现在开始我将<b>显示</b>思考过程。');
    } else if (arg === 'off') {
        settings.showThink = false;
        ctx.replyWithHTML('好的，从现在开始我将<b>隐藏</b>思考过程。');
    } else {
        ctx.replyWithHTML(`当前状态: <b>${settings.showThink ? 'On' : 'Off'}</b>\n请使用 <code>/showthink on</code> 或 <code>/showthink off</code> 进行设置。`);
    }
});

// 新增：/notice 命令
bot.command('notice', (ctx) => {
    const settings = getChatSettings(ctx.chat.id);
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length === 0) {
        const currentKeywords = settings.keywords.length > 0 ? settings.keywords.map(k => `<code>${k}</code>`).join(' ') : '未设置';
        ctx.replyWithHTML(`请提供关键词。\n当前关键词: ${currentKeywords}\n使用 <code>/notice off</code> 关闭。`);
        return;
    }

    if (args[0].toLowerCase() === 'off') {
        settings.keywords = [];
        ctx.replyWithHTML('✅ 关键词自动回复已关闭。');
    } else {
        settings.keywords = args.map(k => k.toLowerCase());
        ctx.replyWithHTML(`✅ 我将自动回复包含以下关键词的消息: ${settings.keywords.map(k => `<code>${k}</code>`).join(' ')}`);
    }
});

// 新增：/background 命令
bot.command('background', (ctx) => {
    const settings = getChatSettings(ctx.chat.id);
    const newPrompt = ctx.message.text.substring(ctx.message.text.indexOf(' ') + 1);

    if (newPrompt.startsWith('/background')) {
        ctx.reply('请输入背景描述。例如:\n/background 你是一个言简意赅的程序员');
        return;
    }
    
    settings.systemPrompt = newPrompt;
    // 清空历史，让新背景立即生效
    conversationHistory.delete(ctx.chat.id); 
    ctx.replyWithHTML(`✅ 背景已更新。对话历史已重置以应用新背景。`);
});

// 改进：/setmodel 命令 (针对每个聊天)
bot.command('setmodel', (ctx) => {
    const settings = getChatSettings(ctx.chat.id);
    const modelName = ctx.message.text.split(' ')[1];

    if (!modelName) {
        const availableModels = Object.keys(ALLOWED_MODELS).map(m => `<code>${m}</code>`).join(', ');
        ctx.replyWithHTML(`<b>当前模型:</b> <code>${settings.modelName}</code>\n<b>可用模型:</b> ${availableModels}`);
        return;
    }

    if (ALLOWED_MODELS[modelName]) {
        settings.model = ALLOWED_MODELS[modelName];
        settings.modelName = modelName;
        ctx.replyWithHTML(`✅ 当前聊天的 AI 模型已切换为: <b>${modelName}</b>`);
    } else {
        const availableModels = Object.keys(ALLOWED_MODELS).map(m => `<code>${m}</code>`).join(', ');
        ctx.replyWithHTML(`❌ 无效的模型名称。\n<b>可用模型:</b> ${availableModels}`);
    }
});

bot.command('clear', (ctx) => {
    const chatId = ctx.chat.id;
    if (conversationHistory.has(chatId)) {
        conversationHistory.delete(chatId);
        ctx.reply('好的，我已经忘记了我们刚才的对话。');
    } else {
        ctx.reply('我们还没开始聊呢，现在就可以开始！');
    }
});

// 新增 /reset 命令
bot.command('reset', (ctx) => {
    const chatId = ctx.chat.id;
    conversationHistory.delete(chatId);
    chatSettings.delete(chatId);
    ctx.reply('✅ 好的，当前聊天的所有对话历史和自定义设置都已重置为默认值。');
});

// --- 核心消息监听器 ---
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const messageText = ctx.message.text.toLowerCase();
    
    // 忽略机器人自己的消息
    if (ctx.message.from.id === ctx.botInfo.id) return;
    
    // 获取当前聊天的设置
    const settings = getChatSettings(chatId);

    // 决定是否触发机器人
    const isReplyToBot = ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo.id;
    const isMentioningBot = messageText.includes(`@${ctx.botInfo.username}`.toLowerCase());
    const hasKeyword = settings.keywords.length > 0 && settings.keywords.some(keyword => messageText.includes(keyword));

    if (isReplyToBot || isMentioningBot || hasKeyword) {
        console.log(`在群组 [${chatId}] 中被触发。`);
        
        const thinkingMessage = await ctx.reply('🤔...', { reply_to_message_id: ctx.message.message_id });

        // 获取或初始化对话历史，使用自定义背景
        if (!conversationHistory.has(chatId)) {
            conversationHistory.set(chatId, [{ role: 'system', content: settings.systemPrompt }]);
        }
        const chatHistory = conversationHistory.get(chatId);

        // 确保使用的总是最新的背景设置
        if (chatHistory[0].content !== settings.systemPrompt) {
            chatHistory[0].content = settings.systemPrompt;
        }

        const cleanMessage = ctx.message.text.replace(`@${ctx.botInfo.username}`, '').trim();
        chatHistory.push({ role: 'user', content: cleanMessage });

        while (chatHistory.length > MAX_CONTEXT_MESSAGES + 1) { chatHistory.splice(1, 1); }

        // 使用当前聊天的自定义模型进行请求
        let aiResponse = await getAiResponse(chatHistory, settings.model);

        // 根据设置处理 <think> 标签
        if (!settings.showThink) {
            const thinkIndex = aiResponse.lastIndexOf(THINK_TAG);
            if (thinkIndex !== -1) {
                aiResponse = aiResponse.substring(thinkIndex + THINK_TAG.length).trim();
            }
        }

        chatHistory.push({ role: 'assistant', content: aiResponse });

        const htmlResponse = markdownToTelegramHtml(aiResponse);

        ctx.telegram.editMessageText(
            chatId, thinkingMessage.message_id, null, htmlResponse || "...", { parse_mode: 'HTML' }
        ).catch(err => {
            console.error("HTML 解析失败:", err.message);
            ctx.telegram.editMessageText(chatId, thinkingMessage.message_id, null, aiResponse);
        });
    }
});

// 启动机器人
bot.launch().then(() => {
    console.log(`Telegram Bot 已启动，默认模型: ${DEFAULT_MODEL}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
