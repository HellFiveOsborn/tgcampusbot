
const SQLiteHelper = require('./src/SQLiteHelper');
const SessionCache = require('./src/SessionCache');

require('dotenv').config({encoding: 'utf8'});
const { Telegraf } = require('telegraf');
// @===================================================================================================
const { startTemplate } = require('./src/cmd/start');
const { listarCursos } = require('./src/cmd/cursos');
const { cursoInfo } = require('./src/cmd/curso');
const { assistirCurso } = require('./src/cmd/assistir');
const { setStatusAula } = require('./src/cmd/setstatus');
// @=============================================ADMIN=================================================
const { InputAddCurso, setStatusCurso } = require('./src/cmd/admin/addcurso');
const { uploadVideoAula, InputAddAula } = require('./src/cmd/admin/addaula');
const { editarCurso } = require('./src/cmd/admin/editcurso');
const { listarCursosAdmin } = require('./src/cmd/admin/cursos');
const { InputMultiAula, uploadMultiVideoAulas } = require('./src/cmd/admin/addmultiaula');

// @===================================================================================================
const adminChatId = process.env.ADMIN_CHAT_ID; // Chat_ID do administrador
const backupChatId = process.env.BACKUP_CHAT_ID; // backup das aulas
const helper = new SQLiteHelper('database.db');
const sessionCache = new SessionCache(); // Criação da instância da classe SessionCache

// helper.setup();

const bot = new Telegraf(process.env.BOT_TOKEN);
    
// Middleware's
bot.use(helper.ControlaFloodMiddleware.bind(helper));

bot.start((ctx) => startTemplate(ctx)); // Apresentação do bot
bot.action(/\/cursos(\s\d+)?/, async (ctx) => await listarCursos(ctx, helper)); // Listar cursos disponíveis
bot.action(/\/curso (\d+)(?:\s(\d+))?/, async (ctx) => await cursoInfo(ctx, helper)); // Informações curso
bot.action(/\/watch (\d+) (\d+)(\s\d+)?/, async (ctx) => await assistirCurso(ctx, helper)); // Assistir aula
bot.action(/\/setstatus (\d+) (\d+)/, async (ctx) => await setStatusAula(ctx, helper)); // Define status da aula Visto/Não Visto

/**
 *  A D M I N
 */
bot.action('/admin', (ctx) => {
    ctx.answerCbQuery('⌛️ Carregando opções...');

    const previousMessageId = ctx.update.callback_query.message.message_id;

    const buttons = [
        [{ text: '➕ Criar Curso', callback_data: '/addcurso' }, { text: '📚 Lista de Cursos', callback_data: '/listacursos' }],
        //   [{ text: '👤 Lista de Alunos', callback_data: '/liststudents' }],
        [{ text: '🔙 Voltar', callback_data: '/voltar' }]
    ];

    if (ctx.chat.id == adminChatId) {
        ctx.editMessageText(`Olá ${ctx.chat.first_name}, você está no modo *Administrador*`, {
            message_id: previousMessageId,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    }
});

// Iniciar o processo de adição do curso
bot.action('/addcurso', async (ctx) => {
    ctx.answerCbQuery('⌛️ Carregando opções...');

    // Atualiza a sessão com a etapa atual
    sessionCache.setEx(`etapa_addcurso_${ctx.from.id}`, {
        step: 'titulo'
    }, 180); // Expira em 3 minutos

    await InputAddCurso(ctx, sessionCache)
}); 

// Iniciar o processo de adição das aulas
bot.action(/\/addaula (\d+)/, async (ctx) => {
    ctx.answerCbQuery('⌛️ Carregando opções...');

    // Atualiza a sessão com a etapa atual
    sessionCache.setEx(`etapa_addaula_${ctx.from.id}`, {
        curso_id: ctx.match[1], 
        step: 'titulo'
    }, 180); // Expira em 3 minutos    

    await InputAddAula(ctx, sessionCache);
}); 

// Iniciar o processo de adição de multiplas aulas
bot.action(/\/multienvio (\d+)/, async (ctx) => {
    ctx.answerCbQuery('💽 Envie ate 10 videoaulas...');

    await InputMultiAula(ctx, sessionCache);
}); 

bot.action(/\/listacursos(\s\d+)?/, async (ctx) => await listarCursosAdmin(ctx, helper)); // Listar cursos
bot.action(/\/editarcurso (\d+)(?:\s(\d+))?/, async (ctx) => await editarCurso(ctx, helper, sessionCache)); // Editar curso
bot.action(['status_ativo', 'status_inativo'], async (ctx) => await setStatusCurso(ctx, sessionCache, helper)); // Ação para capturar a escolha do status
bot.action('/voltar', async (ctx) => {
    ctx.answerCbQuery('⌛️ Voltando para o início...');
    ctx.deleteMessage();
    startTemplate(ctx);
});

// Aguardar o envio ou encaminhamento dos vídeos
bot.on('video', async (ctx) => {
    const currentStep = sessionCache.get(`etapa_addaula_${ctx.chat.id}`);

    if (!currentStep) return;

    const { curso_id, step } = currentStep;

    if (ctx.chat.id == adminChatId) {
        if ( step == 'envio_video' ) {
            await uploadVideoAula(ctx, sessionCache, helper, curso_id);
        } else if ( step == 'multi_envio_video' ) {
            await uploadMultiVideoAulas(ctx, sessionCache, curso_id);
        }
    }
});

bot.on('message', async (ctx) => {
    await InputAddCurso(ctx, sessionCache); // Processo de cadastrar curso.
    await InputAddAula(ctx, sessionCache); // Processo de cadastrar aula.
});

// Tratar as ações dos botões de confirmação e cancelamento
bot.action('/confirmar_envio', async (ctx) => {
    const videoQueue = sessionCache.get(`video_queue_${ctx.from.id}`);
    const msgId = sessionCache.get(`video_queue_msg_id_${ctx.from.id}`) || null;

    if (ctx.chat.id == adminChatId) {
        if (videoQueue) {
            const { curso_id, videos } = videoQueue;

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
                let curso = cursos[0];

                // Criar um array vazio para armazenar os file_ids na ordem correta
                const fileIds = new Array(videos.length);

                // Enviar e processar cada vídeo individualmente
                for (let i = 0; i < videos.length; i++) {
                    const { video, titulo_aula } = videos[i];

                    // Atualizar a mensagem de progresso
                    const { message_id } = await ctx.telegram.editMessageText(ctx.from.id, msgId, null,
                        `*⏳ Processando vídeo ${i + 1} de ${videos.length}...*`,
                        { parse_mode: 'Markdown' }
                    );

                    sessionCache.set(`video_queue_msg_id_${ctx.from.id}`, message_id);

                    const result = await ctx.telegram.sendVideo(backupChatId, video.file_id, {
                        caption: `#${curso.titulo} - ${curso.autor}\n\n${titulo_aula}`,
                        parse_mode: 'Markdown',
                    });

                    // Armazenar o file_id na posição correta do array fileIds
                    fileIds[i] = result.video.file_id;

                    // Simular o processamento do vídeo
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }

                // Chamada ao método insert() para cada vídeo
                for (let i = 0; i < videos.length; i++) {
                    const { titulo_aula, descricao } = videos[i];
                    const fileId = fileIds[i];

                    helper.insert('aulas', { id_curso: curso_id, titulo_aula, descricao, file_id: fileId, chat_id: backupChatId });

                    // Simular o processamento do vídeo
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }

                let lastPage = sessionCache.get(`addlesson_last_page_${ctx.from.id}`);

                await ctx.telegram.editMessageText(ctx.from.id, msgId, null, '*✅ Aulas adicionadas com sucesso!*', {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙 Voltar', callback_data: `/editarcurso ${curso_id} ${lastPage}` }],
                        ],
                    },
                });

                // Limpar a fila de vídeos após o envio bem-sucedido
                sessionCache.delete(`video_queue_${ctx.from.id}`);
                sessionCache.delete(`video_queue_msg_id_${ctx.from.id}`);
            } catch (error) {
                console.error('Erro ao enviar os vídeos para o grupo de backup:', error);
                ctx.editMessageText('Ocorreu um erro ao criar o backup. Por favor, tente novamente mais tarde.');
            }
        }
    }
});

bot.action('/cancelar_envio', async (ctx) => {
    // Limpar a fila de vídeos
    sessionCache.delete(`video_queue_${ctx.from.id}`);

    const msgId = sessionCache.get(`video_queue_msg_id_${ctx.from.id}`) || null;

    if (ctx.chat.id == adminChatId) {
        await ctx.telegram.editMessageText(ctx.from.id, msgId, null,
            '*Envio de vídeos cancelado. A fila de vídeos foi limpa.*', {
            parse_mode: 'Markdown',
        });

        sessionCache.delete(`video_queue_msg_id_${ctx.from.id}`);
    }
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));