const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// 1. App Verbs (ONLY non-auth ones, so we don't mess up blockReplace later)
const replacements = [
  ["app.get('/api/data', (req, res) => {", "app.get('/api/data', async (req, res) => {"],
  ["app.get('/api/settings', (req, res) => {", "app.get('/api/settings', async (req, res) => {"],
  ["app.post('/api/settings', authCheck, (req, res) => {", "app.post('/api/settings', authCheck, async (req, res) => {"],
  ["app.post('/api/login', limiter, (req, res) => {", "app.post('/api/login', limiter, async (req, res) => {"],
  ["app.post('/api/requests', limiter, (req, res) => {", "app.post('/api/requests', limiter, async (req, res) => {"],
  ["app.get('/api/requests', authCheck, (req, res) => {", "app.get('/api/requests', authCheck, async (req, res) => {"],
  ["app.put('/api/requests/:id/status', authCheck, (req, res) => {", "app.put('/api/requests/:id/status', authCheck, async (req, res) => {"],
  ["app.delete('/api/requests/:id', authCheck, (req, res) => {", "app.delete('/api/requests/:id', authCheck, async (req, res) => {"],
  ["app.get('/api/services', (req, res) => {", "app.get('/api/services', async (req, res) => {"],
  ["app.post('/api/services', authCheck, (req, res) => {", "app.post('/api/services', authCheck, async (req, res) => {"],
  ["app.put('/api/services/reorder', authCheck, (req, res) => {", "app.put('/api/services/reorder', authCheck, async (req, res) => {"],
  ["app.put('/api/services/:id', authCheck, (req, res) => {", "app.put('/api/services/:id', authCheck, async (req, res) => {"],
  ["app.delete('/api/services/:id', authCheck, (req, res) => {", "app.delete('/api/services/:id', authCheck, async (req, res) => {"],
  ["app.get('/api/reviews', (req, res) => {", "app.get('/api/reviews', async (req, res) => {"],
  ["app.post('/api/reviews', authCheck, upload.single('image'), (req, res) => {", "app.post('/api/reviews', authCheck, upload.single('image'), async (req, res) => {"],
  ["app.put('/api/reviews/reorder', authCheck, (req, res) => {", "app.put('/api/reviews/reorder', authCheck, async (req, res) => {"],
  ["app.delete('/api/reviews/:id', authCheck, (req, res) => {", "app.delete('/api/reviews/:id', authCheck, async (req, res) => {"],
  ["app.get('/api/clients', authCheck, (req, res) => {", "app.get('/api/clients', authCheck, async (req, res) => {"],
  ["app.post('/api/clients', authCheck, (req, res) => {", "app.post('/api/clients', authCheck, async (req, res) => {"],
  ["app.put('/api/clients/:id', authCheck, (req, res) => {", "app.put('/api/clients/:id', authCheck, async (req, res) => {"],
  ["app.get('/api/client/me', clientAuth, (req, res) => {", "app.get('/api/client/me', clientAuth, async (req, res) => {"],
  ["app.post('/api/clients/:id/cars', authCheck, (req, res) => {", "app.post('/api/clients/:id/cars', authCheck, async (req, res) => {"],
  ["app.delete('/api/clients/:id/cars/:cid', authCheck, (req, res) => {", "app.delete('/api/clients/:id/cars/:cid', authCheck, async (req, res) => {"],
  ["app.post('/api/clients/:id/repairs', authCheck, upload.array('photos', 5), (req, res) => {", "app.post('/api/clients/:id/repairs', authCheck, upload.array('photos', 5), async (req, res) => {"],
  ["app.delete('/api/clients/:id/repairs/:rid', authCheck, (req, res) => {", "app.delete('/api/clients/:id/repairs/:rid', authCheck, async (req, res) => {"],
  ["app.put('/api/client/reminder/:repairId', clientAuth, (req, res) => {", "app.put('/api/client/reminder/:repairId', clientAuth, async (req, res) => {"],
  ["app.post('/api/clients/:id/reminders', authCheck, (req, res) => {", "app.post('/api/clients/:id/reminders', authCheck, async (req, res) => {"],
  ["app.post('/api/debug', (req, res) => {", "app.post('/api/debug', async (req, res) => {"],
  ["app.get('/api/logs', (req, res) => {", "app.get('/api/logs', async (req, res) => {"],
  ["app.get('/api/analytics', authCheck, (req, res) => {", "app.get('/api/analytics', authCheck, async (req, res) => {"],

  ["const authCheck = (req, res, next) => {", "const authCheck = async (req, res, next) => {"],
  ["function verifyTelegramAuth(authData) {", "async function verifyTelegramAuth(authData) {"],

  ["readData()", "await readData()"],
  
  ["bot.onText(/\\/start$/, (msg) => {", "bot.onText(/\\/start$/, async (msg) => {"],
  ["bot.on('contact', (msg) => {", "bot.on('contact', async (msg) => {"],
  ["bot.onText(/\\/admin(?: (.+))?/, (msg, match) => {", "bot.onText(/\\/admin(?: (.+))?/, async (msg, match) => {"],
  ["bot.onText(/\\/unadmin/, (msg) => {", "bot.onText(/\\/unadmin/, async (msg) => {"],
  ["bot.on('message', (msg) => {", "bot.on('message', async (msg) => {"],

  ["multer({ storage: storage })", "multer({ storage: multer.memoryStorage() })"],
  ["image: `/uploads/${req.file.filename}`", "image: 'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64')"],
  ["app.post('/api/auth', limiterAdmin, (req, res) => {", "app.post('/api/auth', limiterAdmin, async (req, res) => {"],
  ["app.put('/api/settings', authCheck, (req, res) => {", "app.put('/api/settings', authCheck, async (req, res) => {"],
  ["app.put('/api/contacts', authCheck, (req, res) => {", "app.put('/api/contacts', authCheck, async (req, res) => {"],
  ["app.put('/api/reviews/:id', authCheck, (req, res) => {", "app.put('/api/reviews/:id', authCheck, async (req, res) => {"],
  ["app.post('/api/requests', (req, res) => {", "app.post('/api/requests', async (req, res) => {"],
  ["app.get('/api/client/auth/telegram/magic/status', (req, res) => {", "app.get('/api/client/auth/telegram/magic/status', async (req, res) => {"],
  ["app.get('/api/client/auth/vk', (req, res) => {", "app.get('/api/client/auth/vk', async (req, res) => {"],
  ["app.post('/api/client/profile/phone', clientAuth, (req, res) => {", "app.post('/api/client/profile/phone', clientAuth, async (req, res) => {"],
  ["app.get('/api/client/profile', clientAuth, (req, res) => {", "app.get('/api/client/profile', clientAuth, async (req, res) => {"],
  ["app.put('/api/client/reminder/:rid', clientAuth, (req, res) => {", "app.put('/api/client/reminder/:rid', clientAuth, async (req, res) => {"],
  ["app.get('/api/clients/:id', authCheck, (req, res) => {", "app.get('/api/clients/:id', authCheck, async (req, res) => {"],
  ["app.delete('/api/clients/:id', authCheck, (req, res) => {", "app.delete('/api/clients/:id', authCheck, async (req, res) => {"]
];

for (let [oldStr, newStr] of replacements) {
  serverCode = serverCode.split(oldStr).join(newStr);
}

// WriteData Regex
serverCode = serverCode.replace(/writeData\((.*?)\)/g, 'await writeData($1)');
serverCode = serverCode.replace(/const await readData  = \(\) =>/g, 'const readData  = () =>');

// Top imports
serverCode = serverCode.replace("const fs          = require('fs');\r\nconst path        = require('path');", 
`const fs          = require('fs');
const path        = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;`);

serverCode = serverCode.replace("const fs          = require('fs');\nconst path        = require('path');", 
`const fs          = require('fs');
const path        = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;`);


// Data Helpers Block Replacement
function blockReplace(code, startText, endText, replacementText) {
  const startIdx = code.indexOf(startText);
  if (startIdx === -1) throw new Error("Could not find start: " + startText);
  const endIdx = code.indexOf(endText, startIdx);
  if (endIdx === -1) throw new Error("Could not find end: " + endText);
  return code.substring(0, startIdx) + replacementText + code.substring(endIdx + endText.length);
}

const dataHelpers = `/* ── Data helpers ── */
async function readData() {
  if (!supabase) return { settings: {}, contacts: {}, services: [], reviews: [], clients: [], requests: [] };
  const [{ data: settings }, { data: contacts }, { data: services }, { data: reviews }, { data: clients }, { data: requests }] = await Promise.all([
    supabase.from('settings').select('*').limit(1).maybeSingle(),
    supabase.from('contacts').select('*').limit(1).maybeSingle(),
    supabase.from('services').select('*').order('sort_order', { ascending: true }),
    supabase.from('reviews').select('*').order('sort_order', { ascending: true }),
    supabase.from('clients').select('*'),
    supabase.from('requests').select('*')
  ]);
  const mapClient = (c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, vkId: c.vk_id, telegramId: c.telegram_id, telegramUsername: c.telegram_username, telegramChatId: c.telegram_chat_id, cars: c.cars, repairs: c.repairs, createdAt: c.created_at });
  const mapRequest = (r) => ({ id: r.id, name: r.name, phone: r.phone, problem: r.problem, address: r.address, timeframe: r.timeframe, status: r.status, clientId: r.client_id, createdAt: r.created_at });
  return {
    settings: settings?.data || {}, contacts: contacts?.data || {}, services: services || [], reviews: reviews || [],
    clients: (clients || []).map(mapClient), requests: (requests || []).map(mapRequest)
  };
}

async function writeData(data) {
  if (!supabase) return;
  try {
    const p = [];
    if (data.settings) p.push(supabase.from('settings').select('id').limit(1).maybeSingle().then(({ data: row }) => row ? supabase.from('settings').update({ data: data.settings }).eq('id', row.id) : supabase.from('settings').insert({ data: data.settings })));
    if (data.contacts) p.push(supabase.from('contacts').select('id').limit(1).maybeSingle().then(({ data: row }) => row ? supabase.from('contacts').update({ data: data.contacts }).eq('id', row.id) : supabase.from('contacts').insert({ data: data.contacts })));
    if (data.services && data.services.length > 0) p.push(supabase.from('services').upsert(data.services.map((s, idx) => ({ ...s, sort_order: idx }))));
    if (data.reviews && data.reviews.length > 0) p.push(supabase.from('reviews').upsert(data.reviews.map((r, idx) => ({ ...r, sort_order: idx }))));
    if (data.clients && data.clients.length > 0) p.push(supabase.from('clients').upsert(data.clients.map(c => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, vk_id: c.vkId, telegram_id: c.telegramId, telegram_username: c.telegramUsername, telegram_chat_id: c.telegramChatId, cars: c.cars, repairs: c.repairs, created_at: c.createdAt }))));
    if (data.requests && data.requests.length > 0) p.push(supabase.from('requests').upsert(data.requests.map(r => ({ id: r.id, name: r.name, phone: r.phone, problem: r.problem, address: r.address, timeframe: r.timeframe, status: r.status, client_id: r.clientId, created_at: r.createdAt }))));
    await Promise.all(p);
  } catch (err) {
    console.error('writeData error:', err);
  }
}`;

let wdEnd = "JSON.stringify(data, null, 2));";
serverCode = blockReplace(serverCode, "/* ── Data helpers ── */", wdEnd, dataHelpers);

// Vercel export block
const endNew = `app.post('/api/telegram-webhook', (req, res) => {
  const bot = getBot();
  if (bot) bot.processUpdate(req.body);
  res.sendStatus(200);
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(\`✅ Server running on http://localhost:\${PORT}\`);
  });
}
module.exports = app;
`;
serverCode = blockReplace(serverCode, "app.listen(PORT, () => {", "process.once('SIGTERM', shutdown);", endNew);


// Auth Block Rewrites for Supabase

// 1. clientAuth
const clientAuthNew = `const clientAuth = async (req, res, next) => {
  const token = req.headers['x-client-token'];
  if (!token) return res.status(401).json({ error: 'No token' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  const { data: session } = await supabase.from('auth_sessions').select('*').eq('token', token).maybeSingle();
  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    if (session) await supabase.from('auth_sessions').delete().eq('token', token);
    return res.status(401).json({ error: 'Session expired' });
  }
  req.clientId = session.client_id;
  next();
};`;
let caEnd = "next();\r\n};";
if (!serverCode.includes(caEnd)) caEnd = "next();\n};";
serverCode = blockReplace(serverCode, "const clientAuth = (req, res, next) => {", caEnd, clientAuthNew);


// 2. OTP Request
const otpReqNew = `app.post('/api/client/auth/request', limiterOtpRequest, async (req, res) => {
  console.log('[DEBUG] POST /api/client/auth/request received:', req.body);
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  if (supabase) {
    await supabase.from('auth_otps').upsert({ phone, code, expires_at: expiresAt });
  }

  console.log(\`[OTP] Generated code \${code} for \${phone}\`);
  res.json({ ok: true });
});`;
let oreqEnd = "res.json({ ok: true });\r\n});";
if (!serverCode.includes(oreqEnd)) oreqEnd = "res.json({ ok: true });\n});";
serverCode = blockReplace(serverCode, "app.post('/api/client/auth/request', limiterOtpRequest, (req, res) => {", oreqEnd, otpReqNew);

// 3. OTP Verify
const otpVerifyNew = `app.post('/api/client/auth', limiterOtpVerify, async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { data: otpRow } = await supabase.from('auth_otps').select('*').eq('phone', phone).maybeSingle();
  if (!otpRow) return res.status(400).json({ error: 'Код не запрашивался' });
  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    await supabase.from('auth_otps').delete().eq('phone', phone);
    return res.status(400).json({ error: 'Код устарел' });
  }
  if (String(otpRow.code) !== String(code)) return res.status(400).json({ error: 'Неверный код' });

  await supabase.from('auth_otps').delete().eq('phone', phone);

  const data = await readData();
  let client = (data.clients || []).find(c => c.phone === phone);
  if (!client) {
    client = { id: crypto.randomUUID(), name: 'Новый клиент', phone, createdAt: new Date().toISOString() };
    if (!data.clients) data.clients = [];
    data.clients.push(client);
    await writeData(data);
  }
  const token = crypto.randomUUID();
  await supabase.from('auth_sessions').insert({ token, client_id: client.id, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
  res.json({ ok: true, token, client });
});`;
let ovEnd = "res.json({ ok: true, token, client });\r\n});";
if (!serverCode.includes(ovEnd)) ovEnd = "res.json({ ok: true, token, client });\n});";
serverCode = blockReplace(serverCode, "app.post('/api/client/auth', limiterOtpVerify, (req, res) => {", ovEnd, otpVerifyNew);

// 4. Magic Init
const magicInitNew = `app.post('/api/client/auth/init', async (req, res) => {
  const sessionId = crypto.randomUUID();
  if (supabase) await supabase.from('auth_magic_links').insert({ session_id: sessionId, status: 'pending' });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  let botUsername = cachedBotUsername;
  if (!botUsername && botToken) {
    try {
      const resp = await fetch(\`https://api.telegram.org/bot\${botToken}/getMe\`);
      const json = await resp.json();
      if (json.ok) { botUsername = json.result.username; cachedBotUsername = botUsername; }
    } catch (err) {}
  }
  res.json({ ok: true, sessionId, botUrl: botUsername ? \`https://t.me/\${botUsername}?start=auth_\${sessionId}\` : null });
});`;
let miEnd = "res.json({ ok: true, sessionId, botUrl: botUsername ? `https://t.me/${botUsername}?start=auth_${sessionId}` : null });\r\n});";
if (!serverCode.includes(miEnd)) miEnd = "res.json({ ok: true, sessionId, botUrl: botUsername ? `https://t.me/${botUsername}?start=auth_${sessionId}` : null });\n});";
serverCode = blockReplace(serverCode, "app.post('/api/client/auth/init', (req, res) => {", miEnd, magicInitNew);

// 5. Magic Poll
const magicPollNew = `app.get('/api/client/auth/poll/:session', async (req, res) => {
  const { session } = req.params;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { data: s } = await supabase.from('auth_magic_links').select('*').eq('session_id', session).maybeSingle();
  if (!s) return res.json({ status: 'not_found' });
  if (s.status === 'pending') return res.json({ status: 'pending' });

  if (s.status === 'approved') {
    const data = await readData();
    const client = (data.clients || []).find(c => c.id === s.client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    await supabase.from('auth_magic_links').delete().eq('session_id', session);
    const token = crypto.randomUUID();
    await supabase.from('auth_sessions').insert({ token, client_id: client.id, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
    return res.json({ status: 'approved', token, client });
  }
  res.json({ status: 'error' });
});`;
let mpEnd = "res.json({ status: 'error' });\r\n});";
if (!serverCode.includes(mpEnd)) mpEnd = "res.json({ status: 'error' });\n});";
serverCode = blockReplace(serverCode, "app.get('/api/client/auth/poll/:session', (req, res) => {", mpEnd, magicPollNew);

// 6. Logout
const logoutNew = `app.post('/api/client/logout', async (req, res) => {
  const token = req.headers['x-client-token'];
  if (token && supabase) await supabase.from('auth_sessions').delete().eq('token', token);
  res.json({ ok: true });
});`;
let loEnd = "res.json({ ok: true });\r\n});";
if (!serverCode.includes(loEnd)) loEnd = "res.json({ ok: true });\n});";
serverCode = blockReplace(serverCode, "app.post('/api/client/logout', (req, res) => {", loEnd, logoutNew);

// 7. Bot Telegram handlers
const magicBotNew = `function getBot() {
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
}

async function setupBotHandlers(bot) {
  bot.onText(/\\/start$/, async (msg) => {
    bot.sendMessage(msg.chat.id, '👋 Привет! Я бот для входа в личный кабинет клиента AutoElectro.\\n\\nОтправьте ваш номер телефона в формате +79991234567, чтобы привязать аккаунт.');
  });

  bot.onText(/\\/start auth_(.+)/, async (msg, match) => {
    const sessionId = match[1];
    const chatId = msg.chat.id;
    if (!supabase) return bot.sendMessage(chatId, '❌ Ошибка сервера: база данных не подключена.');

    const { data: s } = await supabase.from('auth_magic_links').select('*').eq('session_id', sessionId).maybeSingle();
    if (!s || s.status !== 'pending') return bot.sendMessage(chatId, '❌ Ссылка устарела или недействительна. Вернитесь на сайт и нажмите кнопку входа еще раз.');

    const data = await readData();
    let client = (data.clients || []).find(c => String(c.telegramId) === String(msg.from.id) || String(c.telegramChatId) === String(chatId));
    
    if (!client) {
      client = { id: crypto.randomUUID(), name: msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : ''), phone: '', telegramId: msg.from.id, telegramUsername: msg.from.username, telegramChatId: chatId, createdAt: new Date().toISOString() };
      if (!data.clients) data.clients = [];
      data.clients.push(client);
      await writeData(data);
    } else {
      let updated = false;
      if (!client.telegramId) { client.telegramId = msg.from.id; updated = true; }
      if (!client.telegramChatId) { client.telegramChatId = chatId; updated = true; }
      if (updated) await writeData(data);
    }

    await supabase.from('auth_magic_links').update({ status: 'approved', client_id: client.id }).eq('session_id', sessionId);
    bot.sendMessage(chatId, '✅ Вы успешно авторизованы! Можете вернуться на сайт.');
  });`;

let botEnd = "Можете вернуться на сайт.');\r\n  });";
if (!serverCode.includes(botEnd)) botEnd = "Можете вернуться на сайт.');\n  });";
serverCode = blockReplace(serverCode, "function getBot() {", botEnd, magicBotNew);

// Remove the obsolete in-memory stores to keep things clean!
let s1 = "const otpStore = new Map();\r\n\r\n/* ── In-memory session store { token: { clientId, expiresAt } } ── */\r\n// Magic Link Auth Sessions\r\nconst magicSessions = {};";
if (!serverCode.includes(s1)) s1 = "const otpStore = new Map();\n\n/* ── In-memory session store { token: { clientId, expiresAt } } ── */\n// Magic Link Auth Sessions\nconst magicSessions = {};";
serverCode = serverCode.replace(s1, "// Session stores moved to Supabase");
serverCode = serverCode.replace("const sessionStore = new Map();", "");

fs.writeFileSync('api/index.js', serverCode);
console.log('Successfully rebuilt api/index.js directly from server.js with Supabase Auth!');
