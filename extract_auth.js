const fs = require('fs');
const code = fs.readFileSync('api/index.js', 'utf8');

const clientAuthSrc = code.substring(code.indexOf('const clientAuth'), code.indexOf('};', code.indexOf('const clientAuth')) + 2);
const otpRequestSrc = code.substring(code.indexOf("app.post('/api/client/auth/request'"), code.indexOf('});', code.indexOf("app.post('/api/client/auth/request'")) + 3);
const otpVerifySrc = code.substring(code.indexOf("app.post('/api/client/auth', limiterOtpVerify"), code.indexOf('});', code.indexOf("app.post('/api/client/auth', limiterOtpVerify")) + 3);
const magicInitSrc = code.substring(code.indexOf("app.post('/api/client/auth/init'"), code.indexOf('});', code.indexOf("app.post('/api/client/auth/init'")) + 3);
const magicPollSrc = code.substring(code.indexOf("app.get('/api/client/auth/poll/:session'"), code.indexOf('});', code.indexOf("app.get('/api/client/auth/poll/:session'")) + 3);
const logoutSrc = code.substring(code.indexOf("app.post('/api/client/logout'"), code.indexOf('});', code.indexOf("app.post('/api/client/logout'")) + 3);

const botIdx = code.indexOf('bot.onText(/\\/start auth_(.+)/');
const botEndIdx = code.indexOf('});', code.indexOf("bot.sendMessage(chatId, '✅ Вы успешно авторизованы! Можете вернуться на сайт.');")) + 3;
const magicBotSrc = code.substring(botIdx, botEndIdx);

fs.writeFileSync('auth_blocks.json', JSON.stringify({clientAuthSrc, otpRequestSrc, otpVerifySrc, magicInitSrc, magicPollSrc, logoutSrc, magicBotSrc}, null, 2));
