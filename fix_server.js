const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. /admin logic
const adminOld = `    if (pwd === storedPwd) {
      data.settings.masterTelegramChatId = msg.chat.id;
      writeData(data);
      bot.sendMessage(msg.chat.id, '👨‍🔧 <b>Вы успешно назначены Мастером!</b>\\n\\nТеперь сюда будут приходить все уведомления о новых заявках с сайта.', { parse_mode: 'HTML' });
    } else {
      bot.sendMessage(msg.chat.id, '❌ Неверный пароль администратора.');
    }`;

const adminNew = `    if (pwd === storedPwd) {
      if (!data.settings.masterTelegramChatIds) data.settings.masterTelegramChatIds = [];
      const ids = data.settings.masterTelegramChatIds;
      if (!ids.includes(msg.chat.id)) ids.push(msg.chat.id);
      writeData(data);
      bot.sendMessage(msg.chat.id, '👨‍🔧 <b>Вы успешно добавлены в список Мастеров!</b>\\n\\nТеперь сюда будут приходить все уведомления о новых заявках с сайта.', { parse_mode: 'HTML' });
    } else {
      bot.sendMessage(msg.chat.id, '❌ Неверный пароль администратора.');
    }
  });

  /* Unadmin assignment: /unadmin */
  bot.onText(/\\/unadmin/, (msg) => {
    const data = readData();
    let ids = data.settings?.masterTelegramChatIds || [];
    if (ids.includes(msg.chat.id)) {
      data.settings.masterTelegramChatIds = ids.filter(id => id !== msg.chat.id);
      writeData(data);
      bot.sendMessage(msg.chat.id, '🔌 Вы удалены из списка мастеров и больше не будете получать уведомления.');
    } else {
      bot.sendMessage(msg.chat.id, 'Вы не были в списке мастеров.');
    }`;

code = code.replace(adminOld, adminNew);

// 2. Notification logic
const notifyOld = `    // Notify master via Telegram if bot is configured
    try {
      const bot        = getBot();
      const masterChatId = data.settings?.masterTelegramChatId;
      if (bot && masterChatId) {
        bot.sendMessage(masterChatId,
          \`<b>Новая заявка с сайта!</b>\\n\\n\` +
          \`👤 Клиент: \${phone}\\n\` +
          \`📍 Адрес: \${request.address || 'Не указан'}\\n\` +
          \`📝 Описание: \${request.description || 'Нет'}\\n\` +
          \`⏳ Время: \${request.timeframe || 'Любое'}\\n\\n\` +
          \`<a href="\${process.env.SITE_URL || 'http://localhost:3000'}/admin.html">Перейти в панель</a>\`,
          { parse_mode: 'HTML' }
        );
      }
    } catch (e) {
      console.error('Ошибка отправки в Telegram:', e);
    }`;

const notifyNew = `    // Notify masters via Telegram if bot is configured
    try {
      const bot        = getBot();
      const masterChatIds = data.settings?.masterTelegramChatIds || [];
      if (bot && masterChatIds.length > 0) {
        for (const chatId of masterChatIds) {
          bot.sendMessage(chatId,
            \`<b>Новая заявка с сайта!</b>\\n\\n\` +
            \`👤 Клиент: \${phone}\\n\` +
            \`📍 Адрес: \${request.address || 'Не указан'}\\n\` +
            \`📝 Описание: \${request.description || 'Нет'}\\n\` +
            \`⏳ Время: \${request.timeframe || 'Любое'}\\n\\n\` +
            \`<a href="\${process.env.SITE_URL || 'http://localhost:3000'}/admin.html">Перейти в панель</a>\`,
            { parse_mode: 'HTML' }
          ).catch(e => console.error(\`Не удалось отправить уведомление мастеру \${chatId}:\`, e));
        }
      }
    } catch (e) {
      console.error('Ошибка отправки в Telegram:', e);
    }`;

code = code.replace(notifyOld, notifyNew);

// 3. API payload logic
code = code.replace(
  'const { password, telegramBotToken, masterTelegramChatId, ...safeSettings } = data.settings || {};',
  'const { password, telegramBotToken, masterTelegramChatIds, ...safeSettings } = data.settings || {};'
);

fs.writeFileSync('server.js', code);
