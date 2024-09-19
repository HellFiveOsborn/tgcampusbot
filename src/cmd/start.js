const { cursoInfo } = require('./curso');

require('dotenv').config();

/**
 * Função start
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {import('../@types/sqlite-helper')} helper - O objeto helper.
 * @returns {Promise<void>}
 */
const startTemplate = (ctx, helper) => {
    const adminChatId = process.env.ADMIN_CHAT_ID; // Chat_ID do administrador
    const [command, ...args] = ctx.message.text.split(' ');

    if (args.length > 0) {
        ctx.match = [...ctx.match, ...args];
        (async () => await cursoInfo(ctx, helper))();
        return;
    }

    const buttons = [
        [{ text: '📚 Cursos', callback_data: '/cursos' }]
    ];

    // Verifica se o Chat_ID é igual ao do administrador
    if (ctx.from.id == adminChatId) {
        buttons[0].push({ text: '⚙️ Admin', callback_data: '/admin' });
    }

    ctx.reply(`*🫡 Olá! ${ctx.from.first_name}, Você está no TG Campus de Cursos! 🌟*

_Aqui você pode aprender com cursos incríveis. 🚀_

*ℹ️ Recursos:*

• 📚 Ver cursos disponíveis 
• ℹ️ Saber mais sobre o bot
• 📖 Ver seu progresso nos cursos

👉 Interaja com o bot da opção que quiser.

🎯 Queremos ajudá-lo a aprender mais!

Divirta-se com os cursos de alta qualidade e boa sorte! 🌟📚👨‍🎓
    `, { 
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: buttons
        } 
    });
}

module.exports = {
    startTemplate,
}