require('dotenv').config();

/**
 * Função para listar os cursos.
 * @param {import('telegraf').Context} ctx - O objeto de contexto do Telegraf.
 * @param {import('../@types/sqlite-helper')} helper - O objeto helper.
 * @returns {Promise<void>}
 */
const listarCursos = async (ctx, helper) => {
  const page = ctx?.match[1] ? parseInt(ctx?.match[1]) : 1; // Página atual
  const limit = 10; // Limite de itens por página

  helper.consultar(
    'cursos',
    ['status == 1'],
    async (err, cursos) => {
      if (err) {
        ctx.answerCbQuery('❌ Ocorreu um erro ao obter a lista de cursos, tente novamente!', {
          show_alert: true,
        });
      } else {
        ctx.answerCbQuery('⌛️ Carregando cursos...');

        const buttons = [];

        if (cursos.length > 0) {
          const startIndex = (page - 1) * limit;
          const endIndex = page * limit;
          const cursosPaginados = cursos.slice(startIndex, endIndex);

          for (const curso of cursosPaginados) {
            const assistido = await new Promise((resolve, reject) => {
              helper.consultar(
                'progresso_curso',
                [`id_aluno = ${ctx.from.id}`, `id_curso = ${curso.id}`, `assistido = 1`],
                (err, progressos) => {
                  helper.consultar('aulas', [`id_curso = ${curso.id}`], (err, aulas) => {
                    if (progressos.length === 0 || aulas.length === 0) {
                      resolve(0);
                    } else {
                      resolve(progressos.length === aulas.length ? 2 : 1);
                    }
                  });
                }
              );
            });

            const emoji = assistido === 2 ? '🧑🏻‍🎓 ' : assistido === 0 ? '' : '✍️ ';
            buttons.push([{ text: `${emoji}${curso.titulo}`, callback_data: `/curso ${curso.id}` }]);
          }

          // Ordenar os cursos priorizando os assistidos
          buttons.sort((a, b) => {
            const assistidoA = a[0].text.startsWith('🧑🏻‍🎓') ? 0 : a[0].text.startsWith('✍️') ? 1 : 2;
            const assistidoB = b[0].text.startsWith('🧑🏻‍🎓') ? 0 : b[0].text.startsWith('✍️') ? 1 : 2;
            return assistidoA - assistidoB;
          });

          // Adicionar botões de paginação
          const totalPages = Math.ceil(cursos.length / limit);

          if (page && page < totalPages) {
            buttons.push([{ text: '••••', callback_data: `/cursos ${page + 1}` }]);
          } else if (page && page == totalPages && totalPages > 1) {
            buttons.push([{ text: '••••', callback_data: `/cursos 1` }]);
          }

          // Botão de retroceder
          buttons.push([{ text: `🔙 Voltar`, callback_data: `/voltar` }]);

          ctx.editMessageText('*📚 Lista de Cursos 🎓*\n\nEscolha abaixo o curso que deseja explorar e aprimorar seus conhecimentos! 👇', {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: buttons
            }
          });
        } else {
          ctx.reply('*😕 Não há cursos disponíveis!*', {
            parse_mode: 'Markdown'
          });
        }
      }
    },
    'id DESC'
  );
};

module.exports = {
  listarCursos,
}