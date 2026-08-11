const fs = require('fs');
let code = fs.readFileSync('api/index.js', 'utf8');

// Replace getBot
const getBotOldStr = `function getBot() {
  const data  = await readData();
  const token = process.env.TELEGRAM_BOT_TOKEN || data.settings?.telegramBotToken;
  if (!token || !TelegramBot) return null;
  if (!tgBot) {
    tgBot = new TelegramBot(token, { polling: true });
    
    // Prevent polling conflicts from crashing the server during rolling deploys
    tgBot.on('polling_error', (error) => {
      addLog(\`[TG] Polling error: \${error.message || error}\`);
      console.error('Telegram polling error:', error.message || error);
    });
    
    setupBotHandlers(tgBot);
    addLog('[TG] Bot initialized and polling started');
  }
  return tgBot;
}`;

const getBotNewStr = `function getBot() {
  if (process.env.VERCEL) {
    if (!tgBot) {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return null;
      tgBot = new TelegramBot(token);
      if (process.env.SITE_URL) {
        tgBot.setWebHook(process.env.SITE_URL + '/api/telegram-webhook').catch(e => console.error(e));
      }
      setupBotHandlers(tgBot);
    }
    return tgBot;
  } else {
    if (!tgBot) {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return null;
      tgBot = new TelegramBot(token, { polling: true });
      setupBotHandlers(tgBot);
    }
    return tgBot;
  }
}`;

code = code.replace(getBotOldStr, getBotNewStr);
fs.writeFileSync('api/index.js', code);
