require('dotenv').config();

const adminChatId = process.env.ADMIN_CHAT_ID; // Chat_ID do administrador

/**
 * Coletar multiplas aulas.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {object} sessionCache - O objeto de sessionCache.
 * @returns {Promise<void>}
 */
const InputMultiAula = async (ctx, sessionCache) => {
    const curso_id = ctx.match[1];

    if (ctx.chat.id == adminChatId) {
        const { message_id } = await ctx.reply('_1️⃣ Envie ou encaminhe os vídeos a serem adicionados:_', {
            parse_mode: 'Markdown',
            reply_markup: {
                force_reply: true,
            },
        });

        // Salvar o estado atual da sessão
        sessionCache.set(`etapa_addaula_${ctx.from.id}`, { curso_id, step: 'multi_envio_video' });
        sessionCache.setEx(`addlesson_last_page_${ctx.from.id}`, 120);

        sessionCache.set(`video_queue_msg_id_${ctx.from.id}`, message_id);
    }
}

/**
 * Upload multiplas aulas.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {object} sessionCache - O objeto de sessionCache.
 * @returns {Promise<void>}
 */
const uploadMultiVideoAulas = async (ctx, sessionCache, curso_id) => {
    try {
        const video = ctx.message.video;

        // Verificar se já existe uma fila de vídeos
        let videoQueue = sessionCache.get(`video_queue_${ctx.from.id}`);

        if (!videoQueue) { // Criar uma nova fila de vídeos
            videoQueue = {
                curso_id,
                videos: [],
            };
        }

        // Extrair informações do título e descrição do caption do vídeo
        const caption = ctx.message.caption || '';
        const matchTitulo = caption.match(/^(?:#F\d+ )?(?<titulo>.+)/);
        const matchDescricao = caption.match(/(?<=\n\n)(?<descricao>.*)/sm);

        const titulo_aula = matchTitulo?.groups?.titulo?.trim() || ((videoQueue.videos.length + 1) + '. Episodio');
        const descricao = matchDescricao?.groups?.descricao?.trim() || 'N/A';

        // Adicionar o vídeo à fila de vídeos
        videoQueue.videos.push({
            video,
            titulo_aula,
            descricao,
        });

        // Atualizar a sessão com a fila de vídeos
        sessionCache.set(`video_queue_${ctx.from.id}`, videoQueue);

        const queueLength = videoQueue.videos.length;
        const payload = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Sim', callback_data: '/confirmar_envio' },
                        { text: 'Cancelar', callback_data: '/cancelar_envio' },
                    ],
                ],
            },
        };

        if (queueLength < 10) {
            // Ainda há espaço na fila de vídeos, aguardar mais envios
            const { message_id } = await ctx.reply(`*Vídeo adicionado à fila! Total de vídeos na fila:* ${queueLength}`, payload);
            sessionCache.set(`video_queue_msg_id_${ctx.from.id}`, message_id);
        } else {
            // A fila de vídeos atingiu o limite de 10 vídeos, solicitar confirmação para envio
            const { message_id } = await ctx.reply('*A fila de vídeos atingiu o limite de 10 vídeos. Deseja enviar os vídeos para o grupo de backup?*', payload);
            sessionCache.set(`video_queue_msg_id_${ctx.from.id}`, message_id);
        }
    } catch (error) {
        console.error('Erro ao processar os vídeos:', error);
        ctx.reply('Ocorreu um erro ao processar os vídeos. Por favor, tente novamente mais tarde.');
    }    
}

module.exports = {
    InputMultiAula,
    uploadMultiVideoAulas
}