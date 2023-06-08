require('dotenv').config();

const adminChatId = process.env.ADMIN_CHAT_ID; // Chat_ID do administrador

/**
 * Função listar as aulas.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {import('./../../@types/sqlite-helper')} helper - O objeto helper.
 * @returns {Promise<void>}
 */
const listarCursosAdmin = (ctx, helper) => {
    ctx.answerCbQuery('⌛️ Carregando cursos...');

    // Obter o número da página a partir do callback_data
    const page = ctx.match[1] ? parseInt(ctx.match[1]) : 1;
    const itemsPerPage = 10;

    if (ctx.chat.id == adminChatId) {
        helper.consultar('cursos', [], (err, cursos) => {
            if (err) {
                ctx.reply('*❌ Ocorreu um erro ao obter a lista de cursos, tente novamente!*', {
                    parse_mode: 'Markdown'
                });
            } else {
                const totalCursos = cursos.length;
                const totalPages = Math.ceil(totalCursos / itemsPerPage);

                // Calcular o índice inicial e final dos cursos a serem exibidos na página atual
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;

                // Obter os cursos para a página atual
                const cursosPagina = cursos.slice(startIndex, endIndex);

                const buttons = [];

                if ( totalCursos > 0 ) {
                    cursosPagina.map((value, index) => {
                        buttons.push([{ text: `${value.titulo}`, callback_data: `/editarcurso ${value.id}` }])
                    });

                    // Verificar se há mais páginas para exibir o botão de continuar
                    if (page && page < totalPages) {
                        buttons.push([{ text: '••••', callback_data: `/listacursos ${page + 1}` }, { text: `🔙 Voltar`, callback_data: `/voltar` }]);
                    } else if (page && page == totalPages && totalPages > 1) {
                        buttons.push([{ text: '••••', callback_data: `/listacursos 1` }, { text: `🔙 Voltar`, callback_data: `/voltar` }]);
                    } else {
                        // Botão de retroceder
                        buttons.push([{ text: `🔙 Voltar`, callback_data: `/voltar` }]);
                    }      

                    ctx.editMessageText('*📚 Lista de cursos 👇*', {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: buttons
                        } 
                    });
                } else {
                    ctx.reply('*😕 Não há cursos disponíveis!*', {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '➕ Criar Curso', callback_data: '/addcurso' }],
                                [{ text: '🔙 Voltar', callback_data: '/voltar' }]
                            ]
                        } 
                    });
                }
            }
        }, 'id DESC');
    }
}

module.exports = {
    listarCursosAdmin,
}