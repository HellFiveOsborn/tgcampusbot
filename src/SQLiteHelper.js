const sqlite3 = require('sqlite3').verbose();

class SQLiteHelper {
  constructor(database) {
    this.db = new sqlite3.Database(database);
    this.instance = this;
  }

  setup() {
    this.db.serialize(() => {
      // Criar tabela 'usuarios'
      this.db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER,
          ultm_msg INTEGER,
          status INTEGER
        )
      `);

      // Criar tabela 'cursos'
      this.db.run(`
        CREATE TABLE IF NOT EXISTS cursos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          titulo TEXT,
          sobre_curso TEXT,
          autor TEXT,
          status INTEGER
        )
      `);

      // Criar tabela 'aulas'
      this.db.run(`
        CREATE TABLE IF NOT EXISTS aulas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_curso INTEGER,
          titulo_aula TEXT,
          descricao TEXT,
          file_id TEXT,
          chat_id INTEGER
        )
      `);

      // Criar tabela 'material'
      this.db.run(`
        CREATE TABLE IF NOT EXISTS material (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_curso INTEGER,
          id_aula INTEGER,
          descricao TEXT,
          file_id TEXT,
          chat_id INTEGER
        )
      `);

      // Criar tabela 'progresso_curso'
      this.db.run(`
        CREATE TABLE IF NOT EXISTS progresso_curso (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_aluno INTEGER,
          id_curso INTEGER,
          id_aula INTEGER,
          assistido INTEGER
        )
      `);
    });
  }

  // Inserir um registro em uma tabela
  insert(tableName, data, callback) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    try {
      const statement = this.db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`);
      statement.run(values);
      statement.finalize();

      if (callback) {
        callback(true); // Inserção bem-sucedida
      }
    } catch (error) {
      console.error(error);

      if (callback) {
        callback(false); // Inserção falhou
      }
    }
  }

  // Atualizar um registro em uma tabela
  update(tableName, data, condition, callback) {
    const columns = Object.keys(data).map((column) => `${column} = ?`).join(', ');
    const values = Object.values(data);
    const conditionColumns = Object.keys(condition).map((column) => `${column} = ?`).join(' AND ');
    const conditionValues = Object.values(condition);

    try {
      const statement = this.db.prepare(`UPDATE ${tableName} SET ${columns} WHERE ${conditionColumns}`);

      statement.run([...values, ...conditionValues], function (error) {
        if (error) {
          if (callback) {
            callback(false); // Atualização falhou
          }
        } else {
          if (callback) {
            callback(true); // Atualização bem-sucedida
          }
        }
      });
      statement.finalize();
    } catch (error) {
      if (callback) {
        callback(false); // Atualização falhou
      }
    }
  }

  // Excluir registros de uma tabela
  delete(tableName, condition) {
    const conditionColumns = Object.keys(condition).map((column) => `${column} = ?`).join(' AND ');
    const conditionValues = Object.values(condition);

    const statement = this.db.prepare(`DELETE FROM ${tableName} WHERE ${conditionColumns}`);
    statement.run(conditionValues);
    statement.finalize();
  }

  // Consulta registros de uma tabela
  consultar(table, conditions = [], callback, orderby = null, limit = null) {
    const query = `SELECT * FROM ${table} ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''} ${orderby ? 'ORDER BY ' + orderby : ''} ${limit ? 'LIMIT ' + limit : ''}`;
  
    this.db.all(query, (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, rows);
      }
    });
  }

  usuario(chatID, callback) {
    this.consultar('usuarios', [`chat_id = ${chatID}`], (err, usuarios) => {
      if (err) {
        callback(err, null);
      } else {
        if (usuarios.length > 0) {
          callback(null, usuarios[0]); // Retorna o usuário encontrado
        } else {
          const novoUsuario = {
            chat_id: chatID,
            ultm_msg: 0,
            status: 1 // usuário ativo
          };
          
          try {
            this.insert('usuarios', novoUsuario, result => {
              if (result) {
                this.consultar('usuarios', [`chat_id = ${chatID}`], (err, usuarios) => {
                  callback(null, usuarios[0]); // Retorna o usuário cadastrado
                });
              } else {
                callback(null, null);
              }
            });
          } catch (error) {
            callback(error, null);
          }
        }
      }
    });
  }

  // Controla o flood
  ControlaFloodMiddleware(ctx, next) {
    const COOLDOWN_TEMPO = 1 * 1000; // Tempo de cooldown em milissegundos (1 segundos)
  
    const chatID = ctx.chat.id;
    const timestampAtual = Date.now();

    if (ctx.chat.type !== 'private') {
      // Ignorar grupos ou canais
      next();
      return;
    }

    try {
      this.usuario(chatID, (error, usuario) => {
        if (error) {
          console.error('Erro ao obter usuário:', error);
          return;
        }
    
        const { ultm_msg } = usuario;
        const novosDados = { ultm_msg: timestampAtual };
  

        if (ultm_msg && (ultm_msg + COOLDOWN_TEMPO) > timestampAtual) {
          if (ctx.update.callback_query) {
            ctx.answerCbQuery(`Você está enviando muitas mensagens rapidamente. Espere ${COOLDOWN_TEMPO / 1000}s antes de enviar novamente.`, {
              show_alert: true,
            });
          } else {
            ctx.reply(`Você está enviando muitas mensagens rapidamente. Espere ${COOLDOWN_TEMPO / 1000}s antes de enviar novamente.`);
          }
          
          this.update('usuarios', novosDados, { chat_id: chatID });
        } else {
          this.update('usuarios', novosDados, { chat_id: chatID });
          next();
        }
      });      
    } catch (error) {
      console.error(error);
    }
  }
}

module.exports = SQLiteHelper;
