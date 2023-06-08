require('dotenv').config();

/**
 * Função para retornar a aula.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {import('../@types/sqlite-helper')} helper - O objeto helper.
 * @returns {Promise<void>}
 */
const assistirCurso = async (ctx, helper) => {
    ctx.answerCbQuery('⌛️ Carregando aula...');
    
    const courseId = ctx.match[1];
    const aulaId = ctx.match[2];
    const page = ctx.match[3] ? parseInt(ctx.match[3]) : 1;

    // Verificar se a aula anterior está disponível
    const hasPreviousAula = await new Promise((resolve, reject) => {
        helper.consultar(
            'aulas',
            [`id_curso = ${courseId}`, `id < ${aulaId}`],
            (err, aulas) => {
                if (err) {
                    reject(err);
                } else {
                    const previousAula = aulas.pop();
                    resolve({ prev: !!previousAula, id: previousAula ? previousAula.id : null });
                }
            },
            'id DESC',
            1
        );
    });

    // Verificar se a próxima aula está disponível
    const hasNextAula = await new Promise((resolve, reject) => {
        helper.consultar(
            'aulas',
            [`id_curso = ${courseId}`, `id > ${aulaId}`],
            (err, aulas) => {
                if (err) {
                    reject(err);
                } else {
                    const nextAula = aulas.shift();
                    resolve({ next: !!nextAula, id: nextAula ? nextAula.id : null });
                }
            },
            'id ASC',
            1
        );
    });

    const watchAula = await new Promise((resolve, reject) => {
        helper.consultar(
            'aulas',
            [`id_curso = ${courseId}`, `id = ${aulaId}`],
            (err, aulas) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(aulas[0]);
                }
            }
        );
    });

    // Obter o status da aula para o aluno
    const assistido = await new Promise((resolve, reject) => {
        helper.consultar('progresso_curso', [`id_aluno = ${ctx.from.id}`, `id_curso = ${courseId}`, `id_aula = ${aulaId}`], (err, progressos) => {
            if (err) {
                reject(err);
            } 

            if (progressos.length > 0) {
                resolve(progressos[0].assistido == 1 ? true : false);
            } else {
                // Inserir um novo registro
                helper.insert('progresso_curso', { id_aluno: ctx.from.id, id_curso: courseId, id_aula: aulaId,
                    assistido: 0 // Definir como não assistido
                });

                resolve(false); // Definir como não assistido
            }
        });
    });

    const buttons = [];
    const buttons_nextPrev = [];

    if (hasPreviousAula.prev) {
        buttons_nextPrev.push({ text: 'Anterior ⏮️', callback_data: `/watch ${courseId} ${parseInt(hasPreviousAula.id)}` });
    }

    if (hasNextAula.next) {
        buttons_nextPrev.push({ text: '⏭️ Próximo', callback_data: `/watch ${courseId} ${parseInt(hasNextAula.id)}` });
    }

    buttons.push([{ text: ((assistido == false) ? '✅ Marcar como Visto' : '👁️ Marcar como Não Visto'), callback_data: `/setstatus ${courseId} ${aulaId}` }]);
    buttons.push(buttons_nextPrev);
    buttons.push([{ text: `🔙 Voltar`, callback_data: `/curso ${courseId} ${page}` }]);

    // Verificar se a mensagem anterior é um vídeo
    if (ctx.callbackQuery.message.video) {
        if (watchAula.file_id) {
            // Editar a mídia para o novo vídeo
            ctx.telegram.editMessageMedia(
                ctx.chat.id,
                ctx.callbackQuery.message.message_id,
                null,
                {
                    type: 'video',
                    media: watchAula.file_id,
                    caption: `<b>${watchAula.titulo_aula}</b>\n\n${watchAula.descricao}`,
                    parse_mode: 'html'
                },
                {
                    reply_markup: {
                        inline_keyboard: buttons
                    }
                }
            );
        }
    } else {
        // Excluir mensagem anterior
        ctx.deleteMessage();

        // Enviar o vídeo da aula
        ctx.telegram.sendVideo(
            ctx.chat.id,
            watchAula.file_id,
            {
                caption: `<b>${watchAula.titulo_aula}</b>\n\n${watchAula.descricao}`,
                parse_mode: 'html',
                reply_markup: {
                    inline_keyboard: buttons
                }
            }
        );
    }
}

module.exports = {
    assistirCurso,
}