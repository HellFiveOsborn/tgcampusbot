// Importar dependências
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const chatId = process.env.BACKUP_CHAT_ID;

// Função para enviar o backup
async function sendBackup() {
  try {
    // Nome do arquivo de backup com a data atual
    const currentDate = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const backupFileName = `tgcampus-${currentDate}.db`;
    const backupFilePath = path.join(__dirname, backupFileName);

    // Copiar o arquivo database.db para criar o backup
    fs.copyFileSync(path.join(__dirname, 'database.db'), backupFilePath);

    // Enviar o arquivo de backup para o chat do Telegram
    await bot.telegram.sendDocument(chatId, {
      source: backupFilePath,
      filename: backupFileName
    }, {
      caption: `Backup criado em: ${currentDate}`
    });

    console.log('Backup enviado com sucesso!');
    
    // Remover o arquivo de backup após o envio (opcional)
    fs.unlinkSync(backupFilePath);

  } catch (error) {
    console.error('Erro ao enviar o backup:', error);
  }
}

// Chamar a função de backup
sendBackup();
