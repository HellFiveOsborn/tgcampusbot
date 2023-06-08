require('dotenv').config();

/**
 * Função para setar status da aula.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {import('../@types/sqlite-helper')} helper - O objeto helper.
 * @returns {Promise<void>}
 */
const setStatusAula = async (ctx, helper) => {
    ctx.answerCbQuery();

    const courseId = ctx.match[1];
    const aulaId = ctx.match[2];

    // Obter o status da aula para o aluno
    try {
        await new Promise((resolve, reject) => {
            helper.consultar('progresso_curso', [`id_aluno = ${ctx.from.id}`, `id_curso = ${courseId}`, `id_aula = ${aulaId}`], (err, progressos) => {
                if (err) {
                    reject(err);
                } else {
                    if (progressos.length > 0) {
                        const progresso = progressos[0];
                        const novoStatus = progresso.assistido === 1 ? 0 : 1;
                        
                        // Atualizar o status no banco de dados
                        helper.update('progresso_curso', { assistido: novoStatus }, { id_aluno: ctx.from.id, id_curso: parseInt(courseId), id_aula: parseInt(aulaId) },
                            (err) => {
                                if (!err) {
                                    return reject(err);
                                } 

                                // Atualizar o teclado da mensagem anterior
                                const keyboardButtons = ctx.callbackQuery.message.reply_markup.inline_keyboard;

                                const updatedButtons = keyboardButtons.map(row => {
                                    return row.map(button => {
                                        if (button.callback_data === `/setstatus ${courseId} ${aulaId}`) {
                                            // Atualizar o texto do botão com base no novo status
                                            button.text = novoStatus === 0 ? '✅ Marcar como Visto' : '👁️ Marcar como Não Visto';
                                        }
                                        return button;
                                    });
                                });

                                // Enviar uma nova mensagem editada com o teclado atualizado
                                ctx.telegram.editMessageReplyMarkup(ctx.chat.id, ctx.callbackQuery.message.message_id, null, {
                                    inline_keyboard: updatedButtons
                                });

                                // Resolve com o novo status
                                resolve(novoStatus === 1);
                            }
                        );
                    } else {
                        reject('Registro não encontrado.');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Erro:', error);
    }
}

module.exports = {
    setStatusAula,
}