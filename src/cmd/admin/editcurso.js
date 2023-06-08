require('dotenv').config();

const adminChatId = process.env.ADMIN_CHAT_ID; // Chat_ID do administrador

const editarCurso = async (ctx, helper, sessionCache) => {
    ctx.answerCbQuery('⌛️ Carregando editor...');
    
    const courseId = ctx.match[1];
    const page = ctx.match[2] ? parseInt(ctx.match[2]) : 1;
    const itemsPerPage = 10;
    const buttons = [];
    
    if (ctx.chat.id == adminChatId) {
        try {
            const cursos = await new Promise((resolve, reject) => {
                helper.consultar('cursos', [`id = ${courseId}`], (err, cursos) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(cursos);
                    }
                });
            });

            // Dados do curso
            let curso = cursos[0];

            const aulas = await new Promise((resolve, reject) => {
                helper.consultar('aulas', [`id_curso = ${courseId}`], (err, aulas) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(aulas);
                    }
                });
            });

            let totalAulas = aulas.length;

            // Calcular o índice inicial e final das aulas a serem exibidas na página atual
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;

            // Obter as aulas para a página atual
            const aulasPagina = aulas.slice(startIndex, endIndex);

            buttons.push([
                { text: `✏️ Editar Curso`, callback_data: `/editarcursodata ${courseId}` },
                { text: `➕ Add Aula`, callback_data: `/addaula ${courseId}` },
                { text: `⚡️ Add Multiaulas`, callback_data: `/multienvio ${courseId}` }
            ]);

            if (totalAulas > 0) {
                // Existem aulas para exibir na página atual
                aulasPagina.forEach((value, index) => {
                    buttons.push([{ text: `${value.titulo_aula}`, callback_data: `/editlesson ${courseId} ${value.id}` }]);
                });

                // Verificar se há mais páginas para exibir o botão de continuar
                if (page < Math.ceil(totalAulas / itemsPerPage)) {
                    buttons.push([{ text: '••••', callback_data: `/editarcurso ${courseId} ${page + 1}` }, { text: `🔙 Voltar`, callback_data: `/voltar` }]);
                } else {
                    if (page < 1) {
                        buttons.push([{ text: '••••', callback_data: `/editarcurso ${courseId}` }, { text: `🔙 Voltar`, callback_data: `/voltar` }]);
                    } else {
                        buttons.push([{ text: `🔙 Voltar`, callback_data: `/listacursos` }])
                    }
                }

                sessionCache.set(`addlesson_last_page_${ctx.from.id}`, page);
            } else {
                buttons.push([{ text: `❌ Não há aulas!`, callback_data: `/listacursos` }]);
            }

            ctx.editMessageText(`*✏️ Modo editor:*

*Titulo:* _${curso.titulo}_
*Autor:* _${curso.autor}_
${totalAulas > 0 ? `*Aulas:* ${totalAulas}` : '\r'}

*Sobre:*
${curso.sobre_curso}`, {
                reply_markup: {
                    inline_keyboard: buttons
                },
                parse_mode: 'Markdown'
            });
        } catch (err) {
            console.error(err);
            ctx.reply('*❌ Ocorreu um erro ao obter os detalhes do curso, tente novamente!*', {
                parse_mode: 'Markdown'
            });
        }
    }
}

module.exports = {
    editarCurso,
}