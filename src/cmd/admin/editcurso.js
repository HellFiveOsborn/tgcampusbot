require('dotenv').config();

const adminChatId = process.env.ADMIN_CHAT_ID; // Chat_ID do administrador

/**
 * Fun o para editar os dados do curso.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {import('./../../@types/sqlite-helper')} helper - O objeto do SQLiteHelper.
 * @param {object} sessionCache - O objeto sessionCache.
 * @returns {Promise<void>}
 */
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

            ctx.editMessageText(`*✏️ Modo editor:*\n\n`
                + `*Titulo:* _${curso.titulo}_\n`
                + `*Autor:* _${curso.autor}_\n`
                + `${totalAulas > 0 ? `*Aulas:* ${totalAulas}` : '\r'}\n\n`
                + `*Sobre:*\n`
                + `${curso.sobre_curso}`, {
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

/**
 * Função para editar os dados do curso.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {import('./../../@types/sqlite-helper')} helper - O objeto do SQLiteHelper.
 * @param {object} sessionCache - O objeto sessionCache.
 * @returns {Promise<void>}
 */
const editarCursoData = async (ctx, helper, sessionCache) => {
    ctx.answerCbQuery('⌛️ Carregando editor...');
    const courseId = ctx.match.groups?.cursoId || null;
    const action = ctx.match.groups?.action || null;
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

            buttons.push([
                { text: `✏️ Editar Titulo`, callback_data: `/editarcursodata ${courseId} title` },
                { text: `#️⃣ Editar Descrição`, callback_data: `/editarcursodata ${courseId} desc` },
            ], [
                { text: `🔖 Editar Autor`, callback_data: `/editarcursodata ${courseId} author` },
                { text: `🗑 Deletar`, callback_data: `/editarcursodata ${courseId} del` }
            ]);

            ctx.editMessageText(`*✏️ Modo editor:*\n\n`
                + `*Titulo:* _${curso.titulo}_\n`
                + `*Autor:* _${curso.autor}_\n\n`
                + `*Sobre:*\n`
                + `${curso.sobre_curso}`, {
                reply_markup: {
                    inline_keyboard: buttons
                },
                parse_mode: 'Markdown'
            });

            if (action) {
                switch (action) {
                    case 'title':
                        // Atualiza a sessão com a etapa atual
                        sessionCache.setEx(`etapa_editcurso_${ctx.from.id}`, {
                            step: 'titulo',
                            course_id: courseId
                        }, 120); // Expira em 2 minutos
                        ctx.reply('✏️ Digite o novo título do curso:', {
                            reply_markup: {
                                force_reply: true
                            }
                        });
                        break;
                    case 'desc':
                        // Atualiza a sessão com a etapa atual
                        sessionCache.setEx(`etapa_editcurso_${ctx.from.id}`, {
                            step: 'desc',
                            course_id: courseId
                        }, 120); // Expira em 2 minutos
                        ctx.reply('✏️ Digite a nova descrição do curso:', {
                            reply_markup: {
                                force_reply: true
                            }
                        });
                        break;
                    case 'author':
                        // Atualiza a sessão com a etapa atual
                        sessionCache.setEx(`etapa_editcurso_${ctx.from.id}`, {
                            step: 'author',
                            course_id: courseId
                        }, 120); // Expira em 2 minutos
                        ctx.reply('✏️ Digite o novo autor do curso:', {
                            reply_markup: {
                                force_reply: true
                            }
                        });
                        break;
                    case 'del':
                        await new Promise((resolve, reject) => {
                            helper.delete('cursos', {id: courseId}, (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                        }).then(async () => {
                            helper.delete('aulas', {id: courseId}, (err) => {
                                if (err) {
                                    console.error(err);
                                }
                            });
                            helper.delete('progresso_curso', {id: courseId}, (err) => {
                                if (err) {
                                    console.error(err);
                                }
                            });
                            ctx.reply('*✅ O curso foi excluído com sucesso!*', {
                                parse_mode: 'Markdown'
                            });
                        });
                        break;
                }
            }
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
    editarCursoData
}