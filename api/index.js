/* ============================================================
   server.js — AutoElectro Backend v2.2 (Supabase + Vercel)
   Express 5 · Supabase DB · Memory Multer uploads
   + CRM: clients, requests, repairs
   + Telegram OTP + Telegram Login Widget + VK OAuth
   + helmet · rate-limit · bcrypt · CORS whitelist
============================================================ */

'use strict';

try { require('dotenv').config(); } catch (e) {}
const express     = require('express');
const fs          = require('fs');
const path        = require('path');
const cors        = require('cors');
const multer      = require('multer');
const crypto      = require('crypto');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const bcrypt      = require('bcryptjs');
const https       = require('https');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

/* ── In-memory logs (limit to 100) ── */
const memLogs = [];
const addLog = (msg) => {
  memLogs.unshift({ time: new Date().toISOString(), msg });
  if (memLogs.length > 100) memLogs.pop();
};
const origLog = console.log;
const origErr = console.error;
console.log = (...args) => {
  const msg = args.join(' ');
  origLog(...args);
  addLog(msg);
};
console.error = (...args) => {
  origErr(...args);
  addLog('ERROR: ' + args.join(' '));
};

/* ── Optional Telegram Bot ── */
let TelegramBot = null;
try { const pkg = require('node-telegram-bot-api'); TelegramBot = pkg.default || pkg; } catch {}

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Paths ── */
const PUBLIC_DIR = path.join(__dirname, 'public');

/* ── In-memory OTP store { phone: { code, expiresAt } } ── */
const otpStore = new Map();

/* ── In-memory session store { token: { clientId, expiresAt } } ── */
const magicSessions = {};
let cachedBotUsername = '';
const sessionStore = new Map();

/* ── Telegram bot instance (initialised lazily) ── */
let tgBot = null;

async function getBot() {
  const { data: settings } = await supabase.from('settings').select('telegramBotToken').limit(1).maybeSingle();
  const token = process.env.TELEGRAM_BOT_TOKEN || settings?.telegramBotToken;
  if (!token || !TelegramBot) return null;
  if (!tgBot) {
    tgBot = new TelegramBot(token);
    if (process.env.SITE_URL) {
      tgBot.setWebHook(process.env.SITE_URL + '/api/telegram-webhook').catch(err => {
        console.error('Failed to set webhook:', err);
      });
    }
    setupBotHandlers(tgBot);
    addLog('[TG] Bot initialized and webhook set');
  }
  return tgBot;
}

function setupBotHandlers(bot) {
  /* /start — register chat ID by phone number */
  bot.onText(/\/start$/, (msg) => {
    bot.sendMessage(msg.chat.id,
      '👋 Привет! Я бот для входа в личный кабинет клиента AutoElectro.\n\n' +
      'Отправьте ваш номер телефона в формате +79991234567, чтобы привязать аккаунт.'
    );
  });

  /* Magic Link Auth: /start auth_<session_id> */
  bot.onText(/\/start auth_(.+)/, async (msg, match) => {
    const sessionId = match[1];
    const s = magicSessions[sessionId];
    const chatId = msg.chat.id;

    if (!s) {
      return bot.sendMessage(chatId, '❌ Ссылка устарела или недействительна. Вернитесь на сайт и нажмите кнопку входа еще раз.');
    }

    const { data: clients } = await supabase.from('clients').select('*');
    let client = (clients || []).find(c => String(c.telegramId) === String(msg.from.id) || String(c.telegramChatId) === String(chatId));
    
    if (!client) {
      client = {
        id: crypto.randomUUID(),
        name: msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : ''),
        phone: '',
        cars: [],
        repairs: [],
        telegramId: msg.from.id,
        telegramUsername: msg.from.username || '',
        telegramChatId: chatId,
        createdAt: new Date().toISOString()
      };
      await supabase.from('clients').insert([client]);
    } else {
      client.telegramId = msg.from.id;
      client.telegramUsername = msg.from.username || '';
      client.telegramChatId = chatId;
      await supabase.from('clients').update({
        telegramId: client.telegramId,
        telegramUsername: client.telegramUsername,
        telegramChatId: client.telegramChatId
      }).eq('id', client.id);
    }
    
    s.status = 'success';
    s.token = createSession(client.id);

    bot.sendMessage(chatId, '✅ Вы успешно авторизованы как клиент! Теперь можете вернуться в браузер — страница уже открылась.');
  });

  /* Admin assignment: /admin [password] */
  bot.onText(/\/admin(?: (.+))?/, async (msg, match) => {
    const pwd = match[1] ? match[1].trim() : '';
    const { data: settings } = await supabase.from('settings').select('*').limit(1).maybeSingle();
    const storedPwd = settings?.password || 'admin';
    if (!pwd) {
      return bot.sendMessage(msg.chat.id, 'Использование: /admin <пароль>');
    }
    if (pwd === storedPwd) {
      const updatedSettings = { ...settings, masterTelegramChatId: msg.chat.id };
      await supabase.from('settings').upsert(updatedSettings);
      bot.sendMessage(msg.chat.id, '👨‍🔧 <b>Вы успешно назначены Мастером!</b>\n\nТеперь сюда будут приходить все уведомления о новых заявках с сайта.', { parse_mode: 'HTML' });
    } else {
      bot.sendMessage(msg.chat.id, '❌ Неверный пароль администратора.');
    }
  });

  /* Any text message that looks like a phone — register chatId */
  bot.on('message', async (msg) => {
    addLog(`[TG] Received message: ${msg.text} from ${msg.chat.id}`);
    const text = (msg.text || '').trim().replace(/[\s\-()]/g, '');
    if (/^\+7\d{10}$/.test(text) || /^8\d{10}$/.test(text)) {
      const phone = text.startsWith('8') ? '+7' + text.slice(1) : text;
      const { data: clients } = await supabase.from('clients').select('*').eq('phone', phone);
      const client = clients?.[0];
      if (client) {
        await supabase.from('clients').update({ telegramChatId: msg.chat.id }).eq('id', client.id);
        bot.sendMessage(msg.chat.id, `✅ Телефон ${phone} привязан! Теперь коды для входа будут приходить сюда автоматически.`);
      } else {
        bot.sendMessage(msg.chat.id, `⚠️ Номер ${phone} не найден в базе. Сначала обратитесь к мастеру — он создаст ваш профиль.`);
      }
    }
  });
}

/* ── Multer memory storage ── */
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

/* ── Helper: extract filename from storage URL ── */
function getStorageFilename(urlOrPath) {
  try {
    const url = new URL(urlOrPath, 'http://localhost');
    return url.pathname.split('/').pop();
  } catch {
    return urlOrPath.split('/').pop();
  }
}

/* ── CORS whitelist ── */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://autoelectricianlanding-production.up.railway.app',
  process.env.SITE_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

/* ── Helmet (secure HTTP headers) ── */
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

/* ── Rate limiters ── */
const limiterOtpRequest = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyGenerator: req => req.body?.phone || req.ip?.replace(/:\d+[^:]*$/, '') || 'unknown', message: { ok: false, error: 'too_many_requests' }, standardHeaders: true, legacyHeaders: false });
const limiterOtpVerify = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, keyGenerator: req => req.body?.phone || req.ip?.replace(/:\d+[^:]*$/, '') || 'unknown', message: { ok: false, error: 'too_many_requests' } });
const limiterAdmin = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { ok: false, error: 'too_many_requests' } });

/* ── Init bot on startup ── */
setTimeout(() => { try { getBot(); } catch (err) { console.error('Bot Init Error:', err); } }, 1000);

/* ── ID generator ── */
const uid = () => crypto.randomBytes(8).toString('hex');

/* ── Admin auth middleware ── */
const authCheck = async (req, res, next) => {
  const pwd  = req.headers['x-admin-password'] || req.body?.password;
  const { data: settings } = await supabase.from('settings').select('password').limit(1).maybeSingle();
  const stored = settings?.password || '';
  if (!pwd) return res.status(401).json({ error: 'Unauthorized' });
  const isHash = stored.startsWith('$2');
  const ok = isHash ? bcrypt.compareSync(pwd, stored) : (pwd === stored);
  if (ok) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

/* ── Client auth middleware ── */
const clientAuth = (req, res, next) => {
  const token = req.headers['x-client-token'];
  if (!token) return res.status(401).json({ error: 'No token' });
  const session = sessionStore.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessionStore.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  req.clientId = session.clientId;
  next();
};

/* ── Helper: create client session ── */
function createSession(clientId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessionStore.set(token, {
    clientId,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  return token;
}

/* ── Compute client retention status ── */
function retentionStatus(client) {
  const repairs = client.repairs || [];
  if (!repairs.length) return 'none';
  const last  = new Date(repairs[repairs.length - 1].date).getTime();
  const diff  = (Date.now() - last) / (1000 * 60 * 60 * 24 * 30);
  if (diff <= 3)  return 'green';
  if (diff <= 6)  return 'yellow';
  return 'red';
}

/* ── Compute loyalty level ── */
function loyaltyLevel(count) {
  if (count >= 6) return 'veteran';
  if (count >= 3) return 'regular';
  return 'newcomer';
}

/* ══════════════════════════════════════════════════════════
   ░░ TELEGRAM WEBHOOK ░░
══════════════════════════════════════════════════════════ */
app.post('/api/telegram-webhook', async (req, res) => {
  if (tgBot) {
    tgBot.processUpdate(req.body);
  }
  res.sendStatus(200);
});

/* ══════════════════════════════════════════════════════════
   ░░ PUBLIC ROUTES ░░
══════════════════════════════════════════════════════════ */
app.get('/api/data', async (req, res) => {
  const [
    { data: settings },
    { data: contacts },
    { data: services },
    { data: reviews },
    { data: clients },
    { data: requests }
  ] = await Promise.all([
    supabase.from('settings').select('*').limit(1).maybeSingle(),
    supabase.from('contacts').select('*').limit(1).maybeSingle(),
    supabase.from('services').select('*').order('order_index', { ascending: true, nullsFirst: false }),
    supabase.from('reviews').select('*').order('order_index', { ascending: true, nullsFirst: false }),
    supabase.from('clients').select('*'),
    supabase.from('requests').select('*')
  ]);
  
  const data = {
    settings: settings || {},
    contacts: contacts || {},
    services: services || [],
    reviews: reviews || [],
    clients: clients || [],
    requests: requests || []
  };

  const { password, telegramBotToken, ...safeSettings } = data.settings;
  const activeServices = data.services.filter(s => s.active !== false);
  res.json({ ...data, settings: safeSettings, services: activeServices });
});

/* ══════════════════════════════════════════════════════════
   ░░ ADMIN AUTH ░░
══════════════════════════════════════════════════════════ */
app.post('/api/auth', limiterAdmin, async (req, res) => {
  const { data: settings } = await supabase.from('settings').select('password').limit(1).maybeSingle();
  const stored = settings?.password || '';
  const pwd = req.body.password;
  
  const isHash = stored.startsWith('$2');
  const ok = isHash ? bcrypt.compareSync(pwd, stored) : (pwd === stored);
  
  if (ok) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: 'Неверный пароль' });
  }
});

/* ══════════════════════════════════════════════════════════
   ░░ SETTINGS ░░
══════════════════════════════════════════════════════════ */
app.put('/api/settings', authCheck, async (req, res) => {
  const { data: settings } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  const { password: newPwd, telegramBotToken: newToken, ...rest } = req.body;
  
  const updatedSettings = { ...(settings || { id: 1 }), ...rest };
  if (newPwd) updatedSettings.password = newPwd;
  if (newToken !== undefined) {
    updatedSettings.telegramBotToken = newToken;
    if (tgBot) { try { tgBot.stopPolling(); } catch {} tgBot = null; }
    if (newToken) setTimeout(() => { try { getBot(); } catch {} }, 500);
  }
  await supabase.from('settings').upsert(updatedSettings);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   ░░ CONTACTS ░░
══════════════════════════════════════════════════════════ */
app.put('/api/contacts', authCheck, async (req, res) => {
  const { data: contacts } = await supabase.from('contacts').select('*').limit(1).maybeSingle();
  const updatedContacts = { ...(contacts || { id: 1 }), ...req.body };
  await supabase.from('contacts').upsert(updatedContacts);
  res.json({ ok: true, contacts: updatedContacts });
});

/* ══════════════════════════════════════════════════════════
   ░░ SERVICES ░░
══════════════════════════════════════════════════════════ */
app.post('/api/services', authCheck, async (req, res) => {
  const service = req.body;
  if (service.active === undefined) service.active = true;
  if (!service.id) service.id = Date.now().toString();

  await supabase.from('services').upsert(service);
  const { data: services } = await supabase.from('services').select('*').order('order_index', { ascending: true, nullsFirst: false });
  res.json({ ok: true, services });
});

app.put('/api/services/reorder', authCheck, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids required' });
  for (let i = 0; i < ids.length; i++) {
    await supabase.from('services').update({ order_index: i }).eq('id', ids[i]);
  }
  const { data: services } = await supabase.from('services').select('*').order('order_index', { ascending: true, nullsFirst: false });
  res.json({ ok: true, services });
});

app.delete('/api/services/:id', authCheck, async (req, res) => {
  await supabase.from('services').delete().eq('id', req.params.id);
  const { data: services } = await supabase.from('services').select('*').order('order_index', { ascending: true, nullsFirst: false });
  res.json({ ok: true, services });
});

/* ══════════════════════════════════════════════════════════
   ░░ REVIEWS ░░
══════════════════════════════════════════════════════════ */
app.post('/api/reviews', authCheck, upload.single('image'), async (req, res) => {
  let imageUrl = req.body.imageUrl || '';
  if (req.file) {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
    const { error } = await supabase.storage.from('uploads').upload(filename, req.file.buffer, { contentType: req.file.mimetype });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filename);
      imageUrl = publicUrl;
    }
  }

  const review = {
    id: Date.now().toString(),
    name: req.body.name || 'Аноним',
    text: req.body.text || '',
    image: imageUrl,
  };
  await supabase.from('reviews').insert([review]);
  res.json({ ok: true, review });
});

app.put('/api/reviews/:id', authCheck, async (req, res) => {
  await supabase.from('reviews').update(req.body).eq('id', req.params.id);
  const { data: review } = await supabase.from('reviews').select('*').eq('id', req.params.id).single();
  res.json({ ok: true, review });
});

app.delete('/api/reviews/:id', authCheck, async (req, res) => {
  const { data: review } = await supabase.from('reviews').select('*').eq('id', req.params.id).single();
  if (review && review.image && review.image.includes('/uploads/')) {
    const filename = getStorageFilename(review.image);
    await supabase.storage.from('uploads').remove([filename]);
  }
  await supabase.from('reviews').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

app.put('/api/reviews/reorder', authCheck, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids required' });
  for (let i = 0; i < ids.length; i++) {
    await supabase.from('reviews').update({ order_index: i }).eq('id', ids[i]);
  }
  const { data: reviews } = await supabase.from('reviews').select('*').order('order_index', { ascending: true, nullsFirst: false });
  res.json({ ok: true, reviews });
});

/* ══════════════════════════════════════════════════════════
   ░░ REQUESTS ░░
══════════════════════════════════════════════════════════ */
app.post('/api/requests', async (req, res) => {
  const { name, phone, problem } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const request = {
    id: uid(),
    name: name || 'Без имени',
    phone: phone || '',
    problem: problem || '',
    createdAt: new Date().toISOString(),
    status: 'new',
    clientId: null,
  };
  await supabase.from('requests').insert([request]);

  try {
    const { data: settings } = await supabase.from('settings').select('masterTelegramChatId').limit(1).maybeSingle();
    const masterChatId = settings?.masterTelegramChatId;
    if (tgBot && masterChatId) {
      tgBot.sendMessage(masterChatId,
        `📥 <b>Новая заявка!</b>\n👤 ${request.name}\n📞 ${request.phone}\n🔧 ${request.problem || '—'}`,
        { parse_mode: 'HTML' }
      );
    }
  } catch {}

  res.json({ ok: true, id: request.id });
});

app.get('/api/requests', authCheck, async (req, res) => {
  const { data: requests } = await supabase.from('requests').select('*').order('createdAt', { ascending: false });
  res.json({ ok: true, requests: requests || [] });
});

app.put('/api/requests/:id/status', authCheck, async (req, res) => {
  const { status } = req.body;
  await supabase.from('requests').update({ status }).eq('id', req.params.id);
  const { data: req_ } = await supabase.from('requests').select('*').eq('id', req.params.id).single();
  res.json({ ok: true, request: req_ });
});

app.delete('/api/requests/:id', authCheck, async (req, res) => {
  await supabase.from('requests').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   ░░ CLIENT AUTH (Telegram OTP) ░░
══════════════════════════════════════════════════════════ */
app.post('/api/client/auth/request', limiterOtpRequest, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const { data: clients } = await supabase.from('clients').select('*').eq('phone', phone);
  const client = clients?.[0];
  if (!client) return res.status(404).json({ ok: false, error: 'client_not_found' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(phone, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  const chatId = client.telegramChatId;
  let deliveryMode = 'manual';

  if (tgBot && chatId) {
    try {
      tgBot.sendMessage(chatId, `🔐 <b>Код входа в AutoElectro:</b> <code>${code}</code>\n\nКод действителен 10 минут.`, { parse_mode: 'HTML' });
      deliveryMode = 'telegram';
    } catch (e) {
      console.error('Telegram send error:', e.message);
    }
  }

  const exposeCode = deliveryMode === 'manual' && process.env.NODE_ENV !== 'production';
  res.json({
    ok: true,
    deliveryMode,
    ...(exposeCode && { code }),
    telegramLinked: !!(chatId),
    clientName: client.name,
  });
});

app.post('/api/client/auth', limiterOtpVerify, async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });

  const otp = otpStore.get(phone);
  if (!otp || otp.expiresAt < Date.now()) {
    otpStore.delete(phone);
    return res.status(401).json({ ok: false, error: 'code_expired' });
  }
  if (otp.code !== String(code)) {
    return res.status(401).json({ ok: false, error: 'wrong_code' });
  }

  otpStore.delete(phone);

  const { data: clients } = await supabase.from('clients').select('*').eq('phone', phone);
  const client = clients?.[0];
  if (!client) return res.status(404).json({ ok: false, error: 'client_not_found' });

  const token = createSession(client.id);
  res.json({ ok: true, token, clientId: client.id, name: client.name });
});

app.get('/api/client/auth/telegram/magic', async (req, res) => {
  if (!tgBot) return res.status(500).json({ error: 'Telegram bot not configured' });
  
  if (!cachedBotUsername) {
    try {
      const me = await tgBot.getMe();
      cachedBotUsername = me.username;
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch bot username' });
    }
  }

  const sessionId = crypto.randomUUID();
  magicSessions[sessionId] = { status: 'pending', created: Date.now() };
  
  const now = Date.now();
  for (const sid in magicSessions) {
    if (now - magicSessions[sid].created > 10 * 60 * 1000) delete magicSessions[sid];
  }

  res.json({ sessionId, botUsername: cachedBotUsername });
});

app.get('/api/client/auth/telegram/magic/status', async (req, res) => {
  const { session } = req.query;
  const s = magicSessions[session];
  if (!s) return res.json({ status: 'expired' });
  if (s.status === 'success') {
    const token = s.token;
    delete magicSessions[session];
    return res.json({ status: 'success', token });
  }
  res.json({ status: 'pending' });
});

/* ══════════════════════════════════════════════════════════
   ░░ VK OAUTH 2.0 ░░
══════════════════════════════════════════════════════════ */
const VK_APP_ID     = process.env.VK_APP_ID;
const VK_APP_SECRET = process.env.VK_APP_SECRET;
const VK_REDIRECT   = process.env.VK_REDIRECT_URI || 'https://autoelectricianlanding-production.up.railway.app/api/client/auth/vk/callback';

app.get('/api/client/auth/vk', async (req, res) => {
  if (!VK_APP_ID) return res.status(503).json({ ok: false, error: 'vk_not_configured' });
  const url = new URL('https://oauth.vk.com/authorize');
  url.searchParams.set('client_id', VK_APP_ID);
  url.searchParams.set('redirect_uri', VK_REDIRECT);
  url.searchParams.set('scope', 'offline');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('v', '5.131');
  url.searchParams.set('display', 'page');
  res.redirect(url.toString());
});

app.get('/api/client/auth/vk/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/profile.html?auth=error&reason=' + encodeURIComponent(error || 'no_code'));
  if (!VK_APP_ID || !VK_APP_SECRET) return res.redirect('/profile.html?auth=error&reason=not_configured');

  try {
    const tokenUrl = new URL('https://oauth.vk.com/access_token');
    tokenUrl.searchParams.set('client_id', VK_APP_ID);
    tokenUrl.searchParams.set('client_secret', VK_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', VK_REDIRECT);
    tokenUrl.searchParams.set('code', code);

    const vkResp = await new Promise((resolve, reject) => {
      https.get(tokenUrl.toString(), r => { let body = ''; r.on('data', d => body += d); r.on('end', () => resolve(JSON.parse(body))); }).on('error', reject);
    });

    if (vkResp.error) return res.redirect('/profile.html?auth=error&reason=' + encodeURIComponent(vkResp.error));

    const vkId = String(vkResp.user_id);
    const vkEmail = vkResp.email || '';

    const userUrl = `https://api.vk.com/method/users.get?user_ids=${vkId}&fields=first_name,last_name,photo_100&access_token=${vkResp.access_token}&v=5.131`;
    const vkUser = await new Promise((resolve, reject) => {
      https.get(userUrl, r => { let body = ''; r.on('data', d => body += d); r.on('end', () => { try { resolve(JSON.parse(body)?.response?.[0] || {}); } catch { resolve({}); } }); }).on('error', reject);
    });

    const { data: clients } = await supabase.from('clients').select('*');
    let client = (clients || []).find(c => c.vkId === vkId);
    if (!client && vkEmail) client = (clients || []).find(c => c.email === vkEmail);

    if (!client) {
      client = {
        id: uid(),
        name: [vkUser.first_name, vkUser.last_name].filter(Boolean).join(' ') || 'ВК Пользователь',
        phone: '',
        email: vkEmail,
        vkId,
        cars: [],
        repairs: [],
        createdAt: new Date().toISOString(),
      };
      await supabase.from('clients').insert([client]);
    } else {
      if (!client.vkId) {
        client.vkId = vkId;
        await supabase.from('clients').update({ vkId }).eq('id', client.id);
      }
    }

    const token = createSession(client.id);
    res.redirect(`/profile.html?auth=vk&token=${token}&name=${encodeURIComponent(client.name)}`);
  } catch (err) {
    console.error('VK OAuth error:', err.message);
    res.redirect('/profile.html?auth=error&reason=server_error');
  }
});

/* ══════════════════════════════════════════════════════════
   ░░ CLIENT PROFILE ░░
══════════════════════════════════════════════════════════ */
app.get('/api/client/profile', clientAuth, async (req, res) => {
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.clientId).single();
  if (!client) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true, client });
});

app.post('/api/client/profile/phone', clientAuth, async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\+?[0-9]{10,15}$/.test(phone.replace(/[\s\-()]/g, ''))) {
    return res.status(400).json({ ok: false, error: 'invalid_phone' });
  }
  const rawPhone = phone.replace(/[\s\-()]/g, '');
  const cleanPhone = rawPhone.startsWith('+') ? rawPhone : '+' + rawPhone;

  await supabase.from('clients').update({ phone: cleanPhone }).eq('id', req.clientId);
  res.json({ ok: true, phone: cleanPhone });
});

app.get('/api/client/me', clientAuth, async (req, res) => {
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.clientId).single();
  if (!client) return res.status(404).json({ error: 'Not found' });

  const { accessCode, telegramChatId, ...safeClient } = client;
  const repairCount = (client.repairs || []).length;
  safeClient.level = loyaltyLevel(repairCount);

  const { data: settings } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  const { data: contacts } = await supabase.from('contacts').select('*').limit(1).maybeSingle();
  const { password, telegramBotToken, masterTelegramChatIds, ...safeSettings } = settings || {};

  res.json({ ok: true, client: safeClient, masterInfo: { ...safeSettings, contacts: contacts || {} } });
});

app.put('/api/client/reminder/:rid', clientAuth, async (req, res) => {
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.clientId).single();
  if (!client) return res.status(404).json({ error: 'Not found' });

  let found = false;
  const repairs = client.repairs || [];
  repairs.forEach(repair => {
    if (repair.reminder && repair.id === req.params.rid) {
      repair.reminder.done = true;
      found = true;
    }
  });
  if (!found) return res.status(404).json({ error: 'Reminder not found' });
  await supabase.from('clients').update({ repairs }).eq('id', client.id);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   ░░ CRM: CLIENTS ░░
══════════════════════════════════════════════════════════ */
app.get('/api/clients', authCheck, async (req, res) => {
  const { data: clientsData } = await supabase.from('clients').select('*');
  const clients = (clientsData || []).map(c => {
    const repairCount = (c.repairs || []).length;
    const lastRepair = repairCount ? c.repairs[repairCount - 1].date : null;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      level: loyaltyLevel(repairCount),
      repairCount,
      lastRepairDate: lastRepair,
      retention: retentionStatus(c),
      cars: c.cars || [],
      telegramLinked: !!(c.telegramChatId),
    };
  });
  res.json({ ok: true, clients });
});

app.post('/api/clients', authCheck, async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
  
  const { data: existing } = await supabase.from('clients').select('*').eq('phone', phone);
  if (existing && existing.length > 0) return res.status(409).json({ error: 'client_exists' });

  const accessCode = String(Math.floor(1000 + Math.random() * 9000));
  const client = {
    id: uid(),
    name,
    phone,
    accessCode,
    cars: [],
    repairs: [],
    createdAt: new Date().toISOString(),
  };
  await supabase.from('clients').insert([client]);
  res.json({ ok: true, client });
});

app.get('/api/clients/:id', authCheck, async (req, res) => {
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).single();
  if (!client) return res.status(404).json({ error: 'Not found' });
  const repairCount = (client.repairs || []).length;
  res.json({ ok: true, client: { ...client, level: loyaltyLevel(repairCount), retention: retentionStatus(client) } });
});

app.put('/api/clients/:id', authCheck, async (req, res) => {
  const { repairs, cars, id, ...editable } = req.body;
  await supabase.from('clients').update(editable).eq('id', req.params.id);
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).single();
  res.json({ ok: true, client });
});

app.delete('/api/clients/:id', authCheck, async (req, res) => {
  await supabase.from('clients').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

/* ── Cars ── */
app.post('/api/clients/:id/cars', authCheck, async (req, res) => {
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).single();
  if (!client) return res.status(404).json({ error: 'Not found' });

  const car = { id: uid(), status: 'ok', ...req.body };
  const cars = client.cars || [];

  if (car.id && cars.find(c => c.id === car.id)) {
    const idx = cars.findIndex(c => c.id === car.id);
    cars[idx] = car;
  } else {
    car.id = uid();
    cars.push(car);
  }
  await supabase.from('clients').update({ cars }).eq('id', client.id);
  res.json({ ok: true, cars });
});

app.delete('/api/clients/:id/cars/:cid', authCheck, async (req, res) => {
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).single();
  if (!client) return res.status(404).json({ error: 'Not found' });
  
  const cars = (client.cars || []).filter(c => c.id !== req.params.cid);
  await supabase.from('clients').update({ cars }).eq('id', client.id);
  res.json({ ok: true, cars });
});

/* ── Repairs ── */
app.post('/api/clients/:id/repairs', authCheck, upload.array('photos', 5), async (req, res) => {
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).single();
  if (!client) return res.status(404).json({ error: 'Not found' });

  const photos = [];
  if (req.files) {
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
      const { error } = await supabase.storage.from('uploads').upload(filename, file.buffer, { contentType: file.mimetype });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filename);
        photos.push(publicUrl);
      }
    }
  }

  let reminder = null;
  if (req.body.reminderDate && req.body.reminderText) {
    reminder = { date: req.body.reminderDate, text: req.body.reminderText, done: false };
  }

  const repair = {
    id: uid(),
    carId: req.body.carId || null,
    date: req.body.date || new Date().toISOString().slice(0, 10),
    type: req.body.type || 'Другое',
    description: req.body.description || '',
    cost: parseFloat(req.body.cost) || 0,
    photos,
    reminder,
    createdAt: new Date().toISOString(),
  };

  const repairs = client.repairs || [];
  repairs.push(repair);

  await supabase.from('clients').update({ repairs }).eq('id', client.id);
  res.json({ ok: true, repair, repairs });
});

app.delete('/api/clients/:id/repairs/:rid', authCheck, async (req, res) => {
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).single();
  if (!client) return res.status(404).json({ error: 'Not found' });

  const repair = (client.repairs || []).find(r => r.id === req.params.rid);
  if (repair && repair.photos) {
    for (const photoUrl of repair.photos) {
      if (photoUrl && photoUrl.includes('/uploads/')) {
        const filename = getStorageFilename(photoUrl);
        await supabase.storage.from('uploads').remove([filename]);
      }
    }
  }

  const repairs = (client.repairs || []).filter(r => r.id !== req.params.rid);
  await supabase.from('clients').update({ repairs }).eq('id', client.id);
  res.json({ ok: true });
});

app.post('/api/clients/:id/reminders', authCheck, async (req, res) => {
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).single();
  if (!client) return res.status(404).json({ error: 'Not found' });

  const reminder = {
    id: uid(),
    carId: req.body.carId || null,
    date: new Date().toISOString().slice(0, 10),
    type: 'Напоминание',
    description: req.body.text || '',
    cost: 0,
    photos: [],
    reminder: { date: req.body.date, text: req.body.text, done: false },
    createdAt: new Date().toISOString(),
  };

  const repairs = client.repairs || [];
  repairs.push(reminder);
  await supabase.from('clients').update({ repairs }).eq('id', client.id);
  res.json({ ok: true, reminder });
});

/* ══════════════════════════════════════════════════════════
   ░░ MISC / ANALYTICS ░░
══════════════════════════════════════════════════════════ */
app.post('/api/debug', async (req, res) => {
  const logStr = `[FRONTEND DEBUG] ${JSON.stringify(req.body)}`;
  console.log(logStr);
  res.sendStatus(200);
});

app.get('/api/logs', async (req, res) => {
  res.json(memLogs);
});

app.get('/api/analytics', authCheck, async (req, res) => {
  const [ { data: clients }, { data: requests } ] = await Promise.all([
    supabase.from('clients').select('*'),
    supabase.from('requests').select('*')
  ]);
  const cl = clients || [];
  const reqs = requests || [];

  const now = new Date();
  const visitsByMonth = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    visitsByMonth[key] = 0;
  }
  cl.forEach(c => {
    (c.repairs || []).forEach(r => {
      const key = r.date ? r.date.slice(0, 7) : null;
      if (key && visitsByMonth.hasOwnProperty(key)) visitsByMonth[key]++;
    });
  });

  const serviceFreq = {};
  cl.forEach(c => {
    (c.repairs || []).forEach(r => {
      serviceFreq[r.type] = (serviceFreq[r.type] || 0) + 1;
    });
  });

  let monthRevenue = 0, monthVisits = 0;
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  cl.forEach(c => {
    (c.repairs || []).forEach(r => {
      if ((r.date || '').startsWith(monthStr)) {
        monthRevenue += r.cost || 0;
        monthVisits++;
      }
    });
  });

  const churnClients = cl.filter(c => retentionStatus(c) === 'red').map(c => ({
    id: c.id, name: c.name, phone: c.phone,
    lastRepairDate: c.repairs?.slice(-1)[0]?.date || null,
  }));

  res.json({
    ok: true,
    totalClients: cl.length,
    newRequests: reqs.filter(r => r.status === 'new').length,
    monthVisits,
    monthRevenue,
    avgCheck: monthVisits ? Math.round(monthRevenue / monthVisits) : 0,
    churnCount: churnClients.length,
    churnClients,
    visitsByMonth,
    serviceFreq,
  });
});

/* ── Export for Vercel / Start Server ── */
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅  Сервер запущен → http://localhost:${PORT}`);
    console.log(`⚙️   Админка        → http://localhost:${PORT}/admin.html`);
    console.log(`👤  Профиль        → http://localhost:${PORT}/profile.html`);
  });
}
