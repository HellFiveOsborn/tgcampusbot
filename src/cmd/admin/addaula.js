require('dotenv').config();

const adminChatId = process.env.ADMIN_CHAT_ID; // Chat_ID do administrador
const backupChatId = process.env.BACKUP_CHAT_ID; // backup das aulas

/**
 * Função para recolher dados como titulo, descrição da aula.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {import('./../../@types/sqlite-helper')} helper - O objeto helper.
 * @returns {Promise<void>}
 */
const InputAddAula = async (ctx, sessionCache) => {
    const currentStep = sessionCache.get(`etapa_addaula_${ctx.from.id}`); // Verifica a etapa atual
    
    if ( !currentStep ) return;

    if (ctx.chat.id == adminChatId) {
        if (ctx.updateType == 'message') {
            if (ctx.updateType == 'message' && ctx.message.text && ctx.message.text.toLowerCase() == 'cancelar') {
                await ctx.reply('*🤔 Deseja cancelar o processo? Digite:* _SIM_', { 
                    parse_mode: 'Markdown' 
                });
    
                sessionCache.setEx(`cancelar_${ctx.from.id}`, 'aula_manual', 30); // Expira em 30 segundos
                return;
            } else if ( sessionCache.get(`cancelar_${ctx.from.id}`) == 'aula_manual' && ctx.message.text.toLowerCase() == 'sim' ) {
                sessionCache.delete(`etapa_addaula_${ctx.from.id}`);
                sessionCache.delete(`etapa_dados_${ctx.from.id}`);
                sessionCache.delete(`cancelar_${ctx.from.id}`);
    
                await ctx.reply('_❌ Processo Cancelado!_', { parse_mode: 'Markdown' });
                return;
            }
    
            const { curso_id, step } = currentStep;
    
            switch (step) {
                case 'titulo': // Etapa 2: Sobre a aula
                        await ctx.reply('_2️⃣ Digite informações sobre a aula:_', {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                force_reply: true,
                            },
                        });
    
                        const titulo = ctx.message.text;
    
                        sessionCache.setEx(`etapa_dados_${ctx.from.id}`, { titulo }, 300); // Expira em 5 minutos
                        sessionCache.setEx(`etapa_addaula_${ctx.from.id}`, { 
                            curso_id, 
                            step: 'descricao' 
                        }, 120); // Expira em 2 minutos
                    break;
                case 'descricao': // Etapa 3: Enviar o Video
                        await ctx.reply('_3️⃣ Envie ou encaminhe a video aula:_', {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                force_reply: true,
                            },
                        });
            
                        const descricao = ctx.message.text;
            
                        const data = sessionCache.get(`etapa_dados_${ctx.from.id}`);
                        data.descricao = descricao;
    
                        sessionCache.setEx(`etapa_dados_${ctx.from.id}`, data, 420); // Expira em 7 minutos
                        sessionCache.setEx(`etapa_addaula_${ctx.from.id}`, {
                            curso_id, 
                            step: 'envio_video'
                        }, 420); // Expira em 7 minutos
                    break;
            }
        } else { // Volta Etapa 1: Título da aula
            await ctx.reply('_1️⃣ Digite o título da aula:_', {
                parse_mode: 'Markdown',
                reply_markup: {
                    force_reply: true,
                },
            });

            // Atualiza a sessão com a etapa atual
            sessionCache.setEx(`etapa_addaula_${ctx.from.id}`, {
                curso_id: currentStep.curso_id,
                step: 'titulo'
            }, 120); // Expira em 2 minutos
        }
    }
}

/**
 * Salva backup, e salvo no banco de dados!
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {object} sessionCache - O objeto de sessionCache
 * @param {import('./../../@types/sqlite-helper')} helper - O objeto helper.
 * @param {integer} curso_id - ID do Curso
 * @returns {Promise<void>}
 */
const uploadVideoAula = async (ctx, sessionCache, helper, curso_id) => {
    if (ctx.chat.id == adminChatId) {
        try {
            const cursos = await new Promise((resolve, reject) => {
                helper.consultar('cursos', [`id = ${curso_id}`], (err, cursos) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(cursos);
                    }
                });
            });

            // Dados do curso
            const curso = cursos[0];

            await salvarVideoAula(ctx, helper, sessionCache, ctx.message.video, curso);
        } catch (error) {
            console.error('Erro ao enviar o vídeo para o grupo de backup:\n', error);
            ctx.reply('*❌ Ocorreu um erro ao criar o backup. Por favor, tente novamente mais tarde.*', {
                parse_mode: 'Markdown'
            });
        }

        // Remover a sessão do cache
        sessionCache.delete(`etapa_dados_${ctx.from.id}`);
        sessionCache.delete(`etapa_addaula_${ctx.from.id}`);
    }
}

/**
 * Salva backup, e salvo no banco de dados!
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {import('./../../@types/sqlite-helper')} helper - O objeto helper.
 * @param {object} sessionCache - O objeto de sessionCache.
 * @param {object} video - O objeto de video.
 * @param {object} curso - O objeto de curso.
 * @returns {Promise<void>}
 */
const salvarVideoAula = async (ctx, helper, sessionCache, video, curso) => {
    const id_curso = curso.id;
    const { titulo, descricao } = sessionCache.get(`etapa_dados_${ctx.from.id}`)

    // Editar a mensagem para exibir o progresso
    var { message_id } = await ctx.reply('Salvando video...');

    // Enviar o vídeo
    const result = await ctx.telegram.sendVideo(backupChatId, video.file_id, {
        caption: `#${curso.titulo} - ${curso.autor}\n\n${titulo}`,
        parse_mode: 'Markdown'
    });

    const fileId = result.video.file_id;

    // Editar a mensagem para exibir o progresso
    var { message_id } = await ctx.telegram.editMessageText(ctx.from.id, message_id, null, '*💽 Cadastrando videoaula...*', {
        parse_mode: 'Markdown'
    });

    // Inserir os dados no banco de dados
    helper.insert('aulas', { id_curso, titulo_aula: titulo, descricao, file_id: fileId, chat_id: backupChatId }, (success) => {
        if (success) {
            // Editar a mensagem para exibir o progresso final
            ctx.telegram.editMessageText(ctx.from.id, message_id, null, '*✅ Videoaula adicionada com sucesso!*', {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙 Voltar', callback_data: `/editarcurso ${id_curso}` }],
                    ],
                },
            });
        } else {
            // Editar a mensagem para exibir uma mensagem de erro
            ctx.telegram.editMessageText(ctx.from.id, message_id, null, 'Ocorreu um erro ao adicionar a videoaula.', {
                parse_mode: 'Markdown',
            });
        }
    });
};

module.exports = {
    InputAddAula,
    uploadVideoAula
}