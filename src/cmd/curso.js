require('dotenv').config();

/**
 * Função para obter informações do curso.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {import('../@types/sqlite-helper')} helper - O objeto helper.
 * @returns {Promise<void>}
 */
const cursoInfo = async (ctx, helper) => {
    ctx.update?.callback_query && ctx?.answerCbQuery('⌛️ Carregando curso...');
    const courseId = ctx.match[1];
    const page = ctx.match[2] ? parseInt(ctx.match[2]) : 1;
    const itemsPerPage = 10;
    const buttons = [];

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

        let curso = cursos[0];

        if (!curso) throw new Error('Curso não encontrado!');

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

        let totalAssistido = 0;

        if (totalAulas > 0) {
            // Verificar se há aulas assistidas para continuar
            const aulasAssistidas = await new Promise((resolve, reject) => {
                helper.consultar('progresso_curso', [`id_aluno = ${ctx.from.id}`, `id_curso = ${curso.id}`, `assistido = 1`], (err, progressos) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(progressos);
                        totalAssistido = progressos.length;
                    }
                });
            });
        
            // Exibir as demais aulas
            aulasPagina.forEach((value, index) => {
                const ep = (index + 1) + '. Episodio';
                const assistida = aulasAssistidas.find(aula => aula.id_aula === value.id);
                const emoji = assistida ? '✅ ' : '';
                buttons.push([{ text: `${emoji}${value?.titulo_aula || ep }`, callback_data: `/watch ${courseId} ${value.id} ${page}` }]);
            });
        
            // Adicionar botão de continuar para a última aula assistida
            if (aulasAssistidas.length > 0) {
                const ultimaAulaAssistida = aulasAssistidas[aulasAssistidas.length - 1];
                const ultimaAula = aulas.find(aula => aula.id == ultimaAulaAssistida.id_aula);
                const ep = ultimaAulaAssistida?.id_aula + '. Episodio';
                buttons.push([{ text: `✍️ Continuar (${ultimaAula?.titulo_aula || ep})`, callback_data: `/watch ${courseId} ${ultimaAulaAssistida.id_aula} ${page}` }]);
            }
        
            // Verificar se há mais páginas para exibir o botão de continuar
            const totalPages = Math.ceil(totalAulas / itemsPerPage);
        
            if (page && page < totalPages) {
                buttons.push([{ text: '••••', callback_data: `/curso ${courseId} ${page + 1}` }, { text: `🔙 Voltar`, callback_data: `/cursos` }]);
            } else if (page && page == totalPages && totalPages > 1) {
                buttons.push([{ text: '••••', callback_data: `/curso ${courseId}` }, { text: `🔙 Voltar`, callback_data: `/cursos` }]);
            } else {
                buttons.push([{ text: `🔙 Voltar`, callback_data: `/cursos` }])
            }
        } else {
            buttons.push([{ text: `❌ Não há aulas!`, callback_data: `/cursos` }]);
        }

        const msg = `*Título:* _${curso?.titulo}_
*Autor:* _${curso?.autor}_

*Sobre:*
${curso?.sobre_curso}
${totalAssistido == totalAulas ? '\nㅤㅤ*✅ Você completou todas as aulas!*\n' : '\r'}
${totalAulas > 0 ? `🖥 Há *${totalAulas}* Aulas, bons estudos.` : '\r'}

🔗 \`t.me/${ctx.botInfo?.username}?start=${curso.id}\``;

        if (ctx.update?.callback_query?.message?.video) {
            ctx.deleteMessage();
            ctx.reply(msg, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: buttons
                },
                link_preview_options: {
                    show_above_text: true
                }
            })
        } else {
            const payload = {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: buttons
                },
                link_preview_options: {
                    show_above_text: true
                }
            };
            ctx.editMessageText(msg, payload)
                .catch(() => ctx.reply(msg, payload)); 
        }
    } catch (err) {
        console.error(err);
        ctx.reply('*❌ Ocorreu um erro ao obter os detalhes do curso, tente novamente!*', {
            parse_mode: 'Markdown'
        });
    }
};

module.exports = {
    cursoInfo,
}