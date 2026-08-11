const fs = require('fs');
let code = fs.readFileSync('api/index.js', 'utf8');

const getBotOld = /function getBot\(\) \{[\s\S]*?return tgBot;\n\s*\}/;
const getBotNew = `function getBot() {
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

code = code.replace(getBotOld, getBotNew);

// Since readData is async, anywhere that calls it must be async.
// getBot() used to call readData to get the token. Now getBot uses process.env.TELEGRAM_BOT_TOKEN directly!
// But wait, what if the user expects to load token from settings?
// On Vercel, env vars are preferred. We'll stick to process.env.

// Let's run a quick AST-like or manual replace for any remaining `await readData()` in non-async functions.
// setupBotHandlers is NOT async but it calls writeData and readData?
// In original server.js, setupBotHandlers uses readData.
code = code.replace(/function setupBotHandlers\(bot\) \{/, 'async function setupBotHandlers(bot) {');
code = code.replace(/bot\.onText\(\/admin \(.*?\), \(msg, match\) => \{/, 'bot.onText(/\\/admin (.*)/, async (msg, match) => {');
code = code.replace(/bot\.onText\(\/unadmin, \(msg\) => \{/, 'bot.onText(/\\/unadmin/, async (msg) => {');
code = code.replace(/bot\.onText\(\/start, \(msg\) => \{/, 'bot.onText(/\\/start/, async (msg) => {');
code = code.replace(/bot\.on\('contact', \(msg\) => \{/, 'bot.on(\'contact\', async (msg) => {');

fs.writeFileSync('api/index.js', code);
