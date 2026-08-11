const fs = require('fs');

let code = fs.readFileSync('api/index.js', 'utf8');

// Using regex that matches any whitespace/newlines
const getBotRegex = /function getBot\(\)\s*\{[\s\S]*?return tgBot;\s*\}/;

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

if (code.match(getBotRegex)) {
  code = code.replace(getBotRegex, getBotNewStr);
  fs.writeFileSync('api/index.js', code);
  console.log("Replaced successfully");
} else {
  console.log("Did not match!");
}
