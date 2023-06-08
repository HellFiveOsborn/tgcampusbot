require('dotenv').config();

const adminChatId = process.env.ADMIN_CHAT_ID; // Chat_ID do administrador

/**
 * Recolher dados como titulo, descrição do curso e salvar.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {object} sessionCache - O objeto sessionCache
 * @returns {Promise<void>}
 */
const InputAddCurso = async (ctx, sessionCache) => {
    const currentStep = sessionCache.get(`etapa_addcurso_${ctx.from.id}`); // Verifica a etapa atual

    if ( !currentStep ) return;

    if (ctx.chat.id == adminChatId) {
        if ( ctx.updateType == 'message' ) {
            if (ctx.message.text && ctx.message.text.toLowerCase() == 'cancelar') {
                await ctx.reply('*🤔 Deseja cancelar o processo? Digite:* _SIM_', { 
                    parse_mode: 'Markdown' 
                });

                sessionCache.setEx(`cancelar_${ctx.from.id}`, 'curso', 30); // Expira em 30 segundos
                return;
            } else if ( sessionCache.get(`cancelar_${ctx.from.id}`) == 'curso' && ctx.message.text.toLowerCase() == 'sim' ) {
                sessionCache.delete(`step_addcourse_${ctx.from.id}`);
                sessionCache.delete(`cancelar_${ctx.from.id}`);
    
                await ctx.reply('_❌ Processo Cancelado!_', { parse_mode: 'Markdown' });
                return;
            }

            const { step } = currentStep;

            switch (step) {
                case 'titulo': // Etapa 2: Sobre o curso
                        await ctx.reply('_2️⃣ Digite informações sobre o curso:_', {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                force_reply: true,
                            },
                        });

                        const titulo = ctx.message.text;

                        sessionCache.setEx(`etapa_addcurso_data_${ctx.from.id}`, {
                            titulo
                        }, 300); // Expira em 5 minutos
                        sessionCache.setEx(`etapa_addcurso_${ctx.from.id}`, {
                            step: 'sobre_curso'
                        }, 120); // Expira em 2 minutos
                    break;
                case 'sobre_curso': // Etapa 3: Autor
                        await ctx.reply('_3️⃣ Digite o nome do autor do curso:_', {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                force_reply: true,
                            },
                        });
        
                        
                        const sobreCurso = ctx.message.text;

                        var data = sessionCache.get(`etapa_addcurso_data_${ctx.from.id}`);
                        data.sobre_curso = sobreCurso;

                        sessionCache.setEx(`etapa_addcurso_data_${ctx.from.id}`, data, 300); // Expira em 5 minutos
                        sessionCache.setEx(`etapa_addcurso_${ctx.from.id}`, {
                            step: 'autor'
                        }, 120); // Expira em 2 minutos
                    break;
                case 'autor': // Etapa 4: Status
                        await ctx.reply('_4️⃣ Selecione o status do curso:_', {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        { text: 'Visivel', callback_data: 'status_ativo' },
                                        { text: 'Invisivel', callback_data: 'status_inativo' },
                                    ],
                                ],
                            },
                        });

                        const autor = ctx.message.text;

                        var data = sessionCache.get(`etapa_addcurso_data_${ctx.from.id}`);
                        data.autor = autor;

                        sessionCache.setEx(`etapa_addcurso_data_${ctx.from.id}`, data, 300); // Expira em 5 minutos
                        sessionCache.setEx(`etapa_addcurso_${ctx.from.id}`, {
                            step: 'status'
                        }, 120); // Expira em 2 minutos
                    break;
            }
        } else { // Volta Etapa 1: Título do curso
            await ctx.reply('_1️⃣ Digite o título do curso:_', {
                parse_mode: 'Markdown',
                reply_markup: {
                    force_reply: true,
                },
            });

            // Atualiza a sessão com a etapa atual
            sessionCache.setEx(`etapa_addcurso_${ctx.from.id}`, {
                step: 'titulo'
            }, 120); // Expira em 2 minutos
        }
    }
}

/**
 * Finalizar adição do curso e salvar.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {object} sessionCache - O objeto sessionCache
 * @param {import('./../../@types/sqlite-helper')} helper - O objeto do SQLiteHelper
 * @returns {Promise<void>}
 */
const setStatusCurso = async (ctx, sessionCache, helper) => {
    ctx.answerCbQuery('⌛️ Finalizando...');

    if (ctx.chat.id == adminChatId) {
        const currentStep = sessionCache.get(`etapa_addcurso_${ctx.from.id}`);
        
        if (currentStep.step == 'status') {
            const status = ctx.callbackQuery.data === 'status_ativo' ? 1 : 0;
    
            // Executar o método insert() com os dados coletados
            const { titulo, sobre_curso, autor } = sessionCache.get(`etapa_addcurso_data_${ctx.from.id}`);
        
            // Chamada ao método insert() com os dados coletados
            helper.insert('cursos', { titulo, sobre_curso, autor, status });

            await ctx.reply('*✅ O curso foi adicionado com sucesso!*', {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙 Voltar', callback_data: '/listacursos' }],
                    ],
                },
            });
        
            // Remover a sessão do cache
            sessionCache.delete(`etapa_addcurso_${ctx.from.id}`);
            sessionCache.delete(`etapa_addcurso_data_${ctx.from.id}`);
        }
    }
}

module.exports = {
    setStatusCurso,
    InputAddCurso
}