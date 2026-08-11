/* ============================================================
   server.js — AutoElectro Backend v2.1
   Express 5 · JSON flat-file DB · Multer uploads
   + CRM: clients, requests, repairs
   + Telegram OTP + Telegram Login Widget + VK OAuth
   + helmet · rate-limit · bcrypt · CORS whitelist
============================================================ */

'use strict';

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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
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

const PUBLIC_DIR = path.join(__dirname, '../public');

/* ── In-memory OTP store { phone: { code, expiresAt } } ── */
const otpStore = new Map();

/* ── In-memory session store { token: { clientId, expiresAt } } ── */
// Magic Link Auth Sessions
const magicSessions = {};
let cachedBotUsername = '';

const sessionStore = new Map();

/* ── Telegram bot instance (initialised lazily when token is saved) ── */
let tgBot = null;

let cachedToken = process.env.TELEGRAM_BOT_TOKEN || null;

async function getBot() {
  // Use cached token or fetch from Supabase once per cold start
  if (!cachedToken && supabase) {
    const { data: sRow } = await supabase.from('settings').select('data').maybeSingle();
    if (sRow && sRow.data && sRow.data.telegramBotToken) {
      cachedToken = sRow.data.telegramBotToken;
    }
  }
  
  if (!cachedToken) return null;
  if (!TelegramBot) return null;

  if (!tgBot) {
    // On Vercel: create bot WITHOUT polling. Webhook is set separately.
    // On local: use polling.
    if (process.env.VERCEL) {
      tgBot = new TelegramBot(cachedToken);
    } else {
      tgBot = new TelegramBot(cachedToken, { polling: true });
      setupBotHandlers(tgBot);
    }
  }
  return tgBot;
}

async function setupBotHandlers(bot) {
  /* /start — register chat ID by phone number */
  bot.onText(/\/start$/, async (msg) => {
    bot.sendMessage(msg.chat.id,
      '👋 Привет! Я бот для входа в личный кабинет клиента AutoElectro.\n\n' +
      'Отправьте ваш номер телефона в формате +79991234567, чтобы привязать аккаунт.'
    );
  });

  /* Magic Link Auth: /start auth_<session_id> */
  bot.onText(/\/start auth_(.+)/, async (msg, match) => {
    const sessionId = match[1];
    const chatId = msg.chat.id;

    if (!supabase) {
      return bot.sendMessage(chatId, '❌ Ошибка сервера: база данных не подключена.');
    }

    const { data: s } = await supabase.from('auth_magic_links').select('*').eq('session_id', sessionId).maybeSingle();

    if (!s || s.status !== 'pending') {
      return bot.sendMessage(chatId, '❌ Ссылка устарела или недействительна. Вернитесь на сайт и нажмите кнопку входа еще раз.');
    }

    const { data: clients } = await supabase.from('clients').select('*');
    let client = (clients || []).find(c => String(c.telegram_id) === String(msg.from.id) || String(c.telegram_chat_id) === String(chatId));
    
    if (!client) {
      client = {
        id: crypto.randomUUID(),
        name: msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : ''),
        phone: '',
        email: '',
        vk_id: '',
        cars: [],
        repairs: [],
        telegram_id: String(msg.from.id),
        telegram_username: msg.from.username || '',
        telegram_chat_id: String(chatId),
        created_at: new Date().toISOString()
      };
      await supabase.from('clients').insert(client);
    } else {
      let updated = {};
      if (!client.telegram_id) updated.telegram_id = String(msg.from.id);
      if (!client.telegram_chat_id) updated.telegram_chat_id = String(chatId);
      if (Object.keys(updated).length > 0) await supabase.from('clients').update(updated).eq('id', client.id);
    }
    
    await supabase.from('auth_magic_links').update({
      status: 'approved',
      client_id: client.id
    }).eq('session_id', sessionId);

    bot.sendMessage(chatId, '✅ Вы успешно авторизованы как клиент! Теперь можете вернуться в браузер — страница уже открылась.');
  });

  /* Admin assignment: /admin [password] */
  bot.onText(/\/admin(?: (.+))?/, async (msg, match) => {
    const pwd = match[1] ? match[1].trim() : '';
    if (!pwd) {
      return bot.sendMessage(msg.chat.id, 'Использование: /admin <пароль>');
    }
    if (!supabase) return;
    const { data: masters } = await supabase.from('masters').select('*');
    let ok = false;
    let master = null;
    for (const m of (masters || [])) {
      const isHash = m.password.startsWith('$2');
      if (isHash ? bcrypt.compareSync(pwd, m.password) : (pwd === m.password)) {
        ok = true;
        master = m;
        break;
      }
    }
    if (ok) {
      await supabase.from('masters').update({ telegram_chat_id: String(msg.chat.id) }).eq('id', master.id);
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
      if (!supabase) return;
      const { data: client } = await supabase.from('clients').select('*').eq('phone', phone).maybeSingle();
      if (client) {
        await supabase.from('clients').update({ telegram_chat_id: String(msg.chat.id) }).eq('id', client.id);
        bot.sendMessage(msg.chat.id, `✅ Телефон ${phone} привязан! Теперь коды для входа будут приходить сюда автоматически.`);
      } else {
        bot.sendMessage(msg.chat.id, `⚠️ Номер ${phone} не найден в базе. Сначала обратитесь к мастеру — он создаст ваш профиль.`);
      }
    }
  });
}



/* ── Multer storage ── */
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
}));

/* ── Helmet (secure HTTP headers) ── */
app.use(helmet({
  contentSecurityPolicy: false, // Tailwind CDN needs this off
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

/* ── Rate limiters ── */
const limiterOtpRequest = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: { ok: false, error: 'too_many_requests' },
  standardHeaders: true, legacyHeaders: false,
});
const limiterOtpVerify = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 10,
  message: { ok: false, error: 'too_many_requests' },
});
const limiterAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { ok: false, error: 'too_many_requests' },
});
const limiterPublic = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { ok: false, error: 'too_many_requests' },
});

/* ── Data helpers ── */

/* ══════════════════════════════════════════════════
   TELEGRAM WEBHOOK — code-based auth (no deep links)
   Flow:
   1. Site generates 6-digit code → stores in auth_magic_links (session_id, code, status=pending)
   2. User opens bot, sends the 6-digit code
   3. Bot finds pending session by code, approves it, creates/links client
   4. Site polling detects approval → logs user in
══════════════════════════════════════════════════ */
app.post('/api/telegram-webhook', async (req, res) => {
  // Always respond 200 immediately to Telegram so it doesn't retry
  res.sendStatus(200);

  try {
    const bot = await getBot();
    if (!bot || !supabase) return;

    const update = req.body;
    if (!update.message || !update.message.text) return;

    const msg    = update.message;
    const text   = msg.text.trim();
    const chatId = msg.chat.id;
    const from   = msg.from;

    // ── /start — welcome message with instructions ──
    if (text === '/start' || text.startsWith('/start ')) {
      await bot.sendMessage(chatId,
        '👋 Привет! Это бот для входа в личный кабинет AutoElectro.\n\n' +
        '🔑 Как войти на сайт:\n' +
        '1. Откройте личный кабинет: https://auto-electrician-landing.vercel.app/profile.html\n' +
        '2. Нажмите «Войти через Telegram»\n' +
        '3. Появится 6-значный код — отправьте его сюда\n\n' +
        'Жду ваш код! 👇'
      );
      return;
    }

    // ── 6-digit auth code ──
    if (/^\d{6}$/.test(text)) {
      const { data: session, error: sessErr } = await supabase
        .from('auth_magic_links')
        .select('*')
        .eq('code', text)
        .eq('status', 'pending')
        .maybeSingle();

      if (sessErr || !session) {
        await bot.sendMessage(chatId,
          '❌ Код не найден или уже использован.\n\n' +
          'Вернитесь на сайт и нажмите «Войти через Telegram» ещё раз — ' +
          'придёт новый код.'
        );
        return;
      }

      // Check code hasn't expired (10 min)
      const created = new Date(session.created_at);
      if (Date.now() - created.getTime() > 10 * 60 * 1000) {
        await supabase.from('auth_magic_links').update({ status: 'expired' }).eq('session_id', session.session_id);
        await bot.sendMessage(chatId,
          '⏱ Код истёк (10 минут). Вернитесь на сайт и запросите новый.'
        );
        return;
      }

      // Find or create client
      let client = null;
      const { data: existing } = await supabase
        .from('clients')
        .select('*')
        .or(`telegram_id.eq.${String(from.id)},telegram_chat_id.eq.${String(chatId)}`)
        .maybeSingle();

      if (existing) {
        client = existing;
        // Update telegram fields if missing
        const upd = {};
        if (!client.telegram_id) upd.telegram_id = String(from.id);
        if (!client.telegram_chat_id) upd.telegram_chat_id = String(chatId);
        if (!client.telegram_username && from.username) upd.telegram_username = from.username;
        if (Object.keys(upd).length > 0) {
          await supabase.from('clients').update(upd).eq('id', client.id);
        }
      } else {
        const newClient = {
          id: crypto.randomUUID(),
          name: [from.first_name, from.last_name].filter(Boolean).join(' '),
          phone: '', email: '', vk_id: '',
          cars: [], repairs: [],
          telegram_id: String(from.id),
          telegram_username: from.username || '',
          telegram_chat_id: String(chatId),
          created_at: new Date().toISOString()
        };
        await supabase.from('clients').insert([newClient]);
        client = newClient;
      }

      // Approve session
      await supabase
        .from('auth_magic_links')
        .update({ status: 'approved', client_id: client.id })
        .eq('session_id', session.session_id);

      // Notify admins
      const { data: settingsRow } = await supabase.from('settings').select('data').maybeSingle();
      const adminIds = settingsRow?.data?.masterTelegramChatIds || [];
      for (const adminId of adminIds) {
        bot.sendMessage(adminId,
          `🟢 Новый вход в кабинет:\nКлиент: ${client.name}\nTG: @${client.telegram_username || from.id}`
        ).catch(() => {});
      }

      await bot.sendMessage(chatId,
        '✅ Вы успешно вошли в личный кабинет AutoElectro!\n\n' +
        '↩️ Вернитесь на страницу сайта — она обновится автоматически.'
      );
      return;
    }

    // ── Any other message ──
    await bot.sendMessage(chatId,
      '🤖 Я понимаю только 6-значные коды авторизации.\n\n' +
      'Чтобы войти в личный кабинет:\n' +
      '1. Перейдите на сайт → Войти через Telegram\n' +
      '2. Получите код\n' +
      '3. Отправьте его сюда'
    );

  } catch (err) {
    console.error('Webhook error:', err);
  }
});


/* ── Init bot on startup if token is already saved ── */
(async () => {
  try {
    await getBot();
  } catch (err) {
    addLog(`[TG] Bot Init Error: ${err.stack || err}`);
    console.error('Bot Init Error:', err);
  }
})();

/* ── ID generator ── */
const uid = () => crypto.randomBytes(8).toString('hex');

/* ── Middleware: Admin Auth Check ── */
const authCheck = async (req, res, next) => {
  const token = req.headers['x-admin-password'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  const [username, ...pwdParts] = token.split(':');
  const pwd = pwdParts.join(':');
  if (!username || !pwd) return res.status(401).json({ error: 'Unauthorized' });

  const { data: m } = await supabase.from('masters').select('*').eq('username', username).maybeSingle();
  if (!m) return res.status(401).json({ error: 'Unauthorized' });
  
  const isHash = m.password.startsWith('$2');
  const ok = isHash ? bcrypt.compareSync(pwd, m.password) : pwd === m.password;
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });
  
  req.master = m;
  next();
};

// 2. /api/data (Public)
app.get('/api/data', async (req, res) => {
  if (!supabase) return res.json({ settings: {}, services: [], reviews: [], contacts: {} });
  const [settingsReq, servicesReq, reviewsReq, contactsReq] = await Promise.all([
    supabase.from('settings').select('*').maybeSingle(),
    supabase.from('services').select('*').eq('active', true).order('sort_order', { ascending: true }),
    supabase.from('reviews').select('*').order('sort_order', { ascending: true }),
    supabase.from('contacts').select('*').maybeSingle()
  ]);
  const settings = settingsReq.data?.data || {};
  const { password, telegramBotToken, masterTelegramChatIds, ...safeSettings } = settings;
  const contacts = contactsReq.data?.data || {};
  res.json({ 
    settings: safeSettings, 
    services: servicesReq.data || [],
    reviews: reviewsReq.data || [],
    contacts: contacts
  });
});

app.post('/api/auth', limiterAdmin, async (req, res) => {
  const { username, password } = req.body;
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: master } = await supabase.from('masters').select('*').eq('username', username).maybeSingle();
  if (!master) return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' });
  
  const isHash = master.password.startsWith('$2');
  const ok = isHash ? bcrypt.compareSync(password, master.password) : (password === master.password);
  
  if (ok) res.json({ ok: true });
  else res.status(401).json({ ok: false, error: 'Неверный логин или пароль' });
});

/* ── Masters Management ── */
app.get('/api/masters', authCheck, async (req, res) => {
  if (!supabase) return res.json({ ok: true, masters: [] });
  const { data } = await supabase.from('masters').select('id, name, username, telegram_chat_id, created_at');
  res.json({ ok: true, masters: data || [] });
});

app.post('/api/masters', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { name, username, password } = req.body;
  if (!name || !username || !password) return res.status(400).json({ ok: false, error: 'Missing fields' });
  const hashedPassword = bcrypt.hashSync(password, 10);
  const { data, error } = await supabase.from('masters').insert({
    name, username, password: hashedPassword
  }).select('id, name, username, telegram_chat_id, created_at').single();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, master: data });
});

app.delete('/api/masters/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { error } = await supabase.from('masters').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true });
});

app.put('/api/settings', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: sRow } = await supabase.from('settings').select('*').maybeSingle();
  let currentSettings = sRow?.data || {};
  
  const { password: newPwd, telegramBotToken: newToken, ...rest } = req.body;
  currentSettings = { ...currentSettings, ...rest };
  
  if (newToken !== undefined) {
    currentSettings.telegramBotToken = newToken;
    if (tgBot) { try { tgBot.stopPolling(); } catch {} tgBot = null; }
    if (newToken) setTimeout(async () => { try { await getBot(); } catch {} }, 500);
  }
  
  if (sRow) await supabase.from('settings').update({ data: currentSettings }).eq('id', sRow.id);
  else await supabase.from('settings').insert({ data: currentSettings });
  
  res.json({ ok: true });
});

app.put('/api/contacts', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: cRow } = await supabase.from('contacts').select('*').maybeSingle();
  let currentContacts = cRow?.data || {};
  currentContacts = { ...currentContacts, ...req.body };
  
  if (cRow) await supabase.from('contacts').update({ data: currentContacts }).eq('id', cRow.id);
  else await supabase.from('contacts').insert({ data: currentContacts });
  
  res.json({ ok: true, contacts: currentContacts });
});

app.post('/api/services', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const service = req.body;
  if (service.active === undefined) service.active = true;
  
  const payload = {
    id: service.id || String(Date.now()),
    title: service.title,
    description: service.description,
    icon: service.icon,
    price: service.price,
    active: service.active,
    sort_order: service.sortOrder || 0
  };
  await supabase.from('services').upsert(payload);
  const { data: services } = await supabase.from('services').select('*').order('sort_order');
  res.json({ ok: true, services });
});

app.put('/api/services/reorder', authCheck, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !supabase) return res.status(400).json({ error: 'ids required' });
  for (let i = 0; i < ids.length; i++) {
    await supabase.from('services').update({ sort_order: i }).eq('id', ids[i]);
  }
  const { data: services } = await supabase.from('services').select('*').order('sort_order');
  res.json({ ok: true, services });
});

app.delete('/api/services/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  await supabase.from('services').delete().eq('id', req.params.id);
  const { data: services } = await supabase.from('services').select('*').order('sort_order');
  res.json({ ok: true, services });
});

app.post('/api/reviews', authCheck, upload.single('image'), async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  let imageUrl = req.body.imageUrl || '';
  if (req.file) {
    const fileName = 'review-' + Date.now() + path.extname(req.file.originalname).toLowerCase();
    const { data: uploadData } = await supabase.storage.from('uploads').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
    if (uploadData) {
      const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
      imageUrl = publicUrlData.publicUrl;
    }
  }
  
  const payload = {
    id: String(Date.now()),
    name: req.body.name || 'Аноним',
    text: req.body.text || '',
    image: imageUrl,
    sort_order: 0
  };
  await supabase.from('reviews').insert(payload);
  res.json({ ok: true, review: payload });
});

app.put('/api/reviews/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const payload = {};
  if (req.body.name !== undefined) payload.name = req.body.name;
  if (req.body.text !== undefined) payload.text = req.body.text;
  if (req.body.image !== undefined) payload.image = req.body.image;
  
  await supabase.from('reviews').update(payload).eq('id', req.params.id);
  const { data: review } = await supabase.from('reviews').select('*').eq('id', req.params.id).single();
  res.json({ ok: true, review });
});

app.delete('/api/reviews/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: review } = await supabase.from('reviews').select('image').eq('id', req.params.id).maybeSingle();
  if (review && review.image && review.image.includes('supabase.co/storage')) {
    const parts = review.image.split('/');
    const fileName = parts[parts.length - 1];
    await supabase.storage.from('uploads').remove([fileName]);
  }
  await supabase.from('reviews').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

app.put('/api/reviews/reorder', authCheck, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !supabase) return res.status(400).json({ error: 'ids required' });
  for (let i = 0; i < ids.length; i++) {
    await supabase.from('reviews').update({ sort_order: i }).eq('id', ids[i]);
  }
  const { data: reviews } = await supabase.from('reviews').select('*').order('sort_order');
  res.json({ ok: true, reviews });
});

app.post('/api/requests', async (req, res) => {
  const { name, phone, problem } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });
  if (!supabase) return res.status(500).json({ error: 'DB error' });
  
  const payload = {
    id: uid(),
    name: name || 'Без имени',
    phone: phone || '',
    problem: problem || '',
    status: 'new',
    created_at: new Date().toISOString()
  };
  await supabase.from('requests').insert(payload);

  try {
    const bot = await getBot();
    if (bot) {
      const { data: masters } = await supabase.from('masters').select('telegram_chat_id');
      for (const m of (masters || [])) {
        if (m.telegram_chat_id) {
          bot.sendMessage(m.telegram_chat_id,
            `📥 <b>Новая заявка!</b>\n👤 ${payload.name}\n📞 ${payload.phone}\n🔧 ${payload.problem || '—'}`,
            { parse_mode: 'HTML' }
          ).catch(()=>{});
        }
      }
    }
  } catch {}

  res.json({ ok: true, id: payload.id });
});

app.get('/api/requests', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: requests } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
  res.json({ ok: true, requests });
});

app.put('/api/requests/:id/status', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { status } = req.body;
  await supabase.from('requests').update({ status }).eq('id', req.params.id);
  const { data: request } = await supabase.from('requests').select('*').eq('id', req.params.id).single();
  res.json({ ok: true, request });
});

app.delete('/api/requests/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  await supabase.from('requests').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

app.get('/api/client/profile', clientAuth, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'DB error' });
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.clientId).maybeSingle();
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

  if (!supabase) return res.status(500).json({ ok: false });
  await supabase.from('clients').update({ phone: cleanPhone }).eq('id', req.clientId);
  res.json({ ok: true, phone: cleanPhone });
});

app.get('/api/client/me', clientAuth, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.clientId).maybeSingle();
  if (!client) return res.status(404).json({ error: 'Not found' });

  const { accessCode, telegram_chat_id, ...safeClient } = client;
  const repairCount = (client.repairs || []).length;
  
  const ll = (cnt) => {
    if (cnt >= 10) return { name: 'VIP', percent: 15 };
    if (cnt >= 5)  return { name: 'Постоянный', percent: 10 };
    if (cnt >= 2)  return { name: 'Лояльный', percent: 5 };
    return { name: 'Новый', percent: 0 };
  };
  safeClient.level = ll(repairCount);

  const { data: sRow } = await supabase.from('settings').select('*').maybeSingle();
  const { data: cRow } = await supabase.from('contacts').select('*').maybeSingle();
  const masterInfo = sRow?.data || {};
  delete masterInfo.password;
  delete masterInfo.telegramBotToken;
  masterInfo.contacts = cRow?.data || {};

  res.json({ ok: true, client: safeClient, masterInfo });
});

app.put('/api/client/reminder/:rid', clientAuth, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: client } = await supabase.from('clients').select('repairs').eq('id', req.clientId).maybeSingle();
  if (!client) return res.status(404).json({ error: 'Not found' });

  let found = false;
  const updatedRepairs = (client.repairs || []).map(repair => {
    if (repair.reminder && String(repair.id) === String(req.params.rid)) {
      repair.reminder.done = true;
      found = true;
    }
    return repair;
  });
  if (!found) return res.status(404).json({ error: 'Reminder not found' });
  await supabase.from('clients').update({ repairs: updatedRepairs }).eq('id', req.clientId);
  res.json({ ok: true });
});

app.get('/api/clients', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: clients } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  res.json({ ok: true, clients });
});

app.post('/api/clients', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { name, phone, email, cars } = req.body;
  
  const payload = {
    id: uid(),
    name: name || 'Аноним',
    phone: phone || '',
    email: email || '',
    vk_id: '',
    telegram_id: '',
    telegram_username: '',
    telegram_chat_id: '',
    cars: Array.isArray(cars) ? cars : [],
    repairs: [],
    created_at: new Date().toISOString()
  };
  await supabase.from('clients').insert(payload);
  res.json({ ok: true, client: payload });
});

app.get('/api/clients/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).maybeSingle();
  if (!client) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true, client });
});

app.put('/api/clients/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { name, phone, email, cars } = req.body;
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (phone !== undefined) payload.phone = phone;
  if (email !== undefined) payload.email = email;
  if (cars !== undefined) payload.cars = cars;
  
  await supabase.from('clients').update(payload).eq('id', req.params.id);
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).maybeSingle();
  res.json({ ok: true, client });
});

app.delete('/api/clients/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  await supabase.from('clients').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

app.post('/api/clients/:id/repairs', authCheck, upload.array('photos', 5), async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  
  let photos = [];
  try {
    if (req.body.photos) {
      const b64 = Array.isArray(req.body.photos) ? req.body.photos : [req.body.photos];
      photos = photos.concat(b64);
    }
  } catch(e){}

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
       const fileName = 'repair-' + Date.now() + '-' + Math.round(Math.random()*1e6) + path.extname(file.originalname).toLowerCase();
       const { data: uploadData } = await supabase.storage.from('uploads').upload(fileName, file.buffer, { contentType: file.mimetype });
       if (uploadData) {
         const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
         photos.push(publicUrlData.publicUrl);
       }
    }
  }

  const repair = {
    id: uid(),
    carId: req.body.carId || null,
    date: req.body.date || new Date().toISOString().slice(0, 10),
    type: req.body.type || 'Другое',
    description: req.body.description || '',
    cost: parseFloat(req.body.cost) || 0,
    photos
  };

  const { data: client } = await supabase.from('clients').select('repairs').eq('id', req.params.id).single();
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const updatedRepairs = [...(client.repairs || []), repair];
  
  await supabase.from('clients').update({ repairs: updatedRepairs }).eq('id', req.params.id);
  res.json({ ok: true, repair });
});

app.delete('/api/clients/:id/repairs/:rid', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: client } = await supabase.from('clients').select('repairs').eq('id', req.params.id).single();
  if (!client) return res.status(404).json({ error: 'Client not found' });
  
  const updatedRepairs = (client.repairs || []).filter(r => String(r.id) !== String(req.params.rid));
  await supabase.from('clients').update({ repairs: updatedRepairs }).eq('id', req.params.id);
  res.json({ ok: true });
});

app.post('/api/clients/:id/reminders', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: client } = await supabase.from('clients').select('repairs').eq('id', req.params.id).maybeSingle();
  if (!client) return res.status(404).json({ error: 'Not found' });

  const reminder = {
    id:          crypto.randomUUID(),
    carId:       req.body.carId || null,
    date:        new Date().toISOString().slice(0, 10),
    type:        'Напоминание',
    description: req.body.text || '',
    cost:        0,
    photos:      [],
    reminder:    { date: req.body.date, text: req.body.text, done: false },
    createdAt:   new Date().toISOString(),
  };
  const updatedRepairs = [...(client.repairs || []), reminder];
  await supabase.from('clients').update({ repairs: updatedRepairs }).eq('id', req.params.id);
  res.json({ ok: true, reminder });
});

app.post('/api/debug', async (req, res) => {
  const logStr = `[FRONTEND DEBUG] ${JSON.stringify(req.body)}`;
  console.log(logStr);
  memLogs.unshift({ time: new Date().toISOString(), msg: logStr });
  if (memLogs.length > 100) memLogs.pop();
  res.sendStatus(200);
});

app.get('/api/logs', async (req, res) => {
  res.json(memLogs);
});

app.get('/api/analytics', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const [{ data: clients }, { data: requests }] = await Promise.all([
    supabase.from('clients').select('*'),
    supabase.from('requests').select('*')
  ]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString();
  
  let newClients30 = 0;
  let revenue30 = 0;
  let requests30 = 0;
  let totalRevenue = 0;

  for (const c of (clients || [])) {
    if (c.created_at >= thirtyDaysAgo) newClients30++;
    for (const r of (c.repairs || [])) {
      if (typeof r.cost === 'number') {
        totalRevenue += r.cost;
        if (r.date >= thirtyDaysAgo) revenue30 += r.cost;
      }
    }
  }

  for (const r of (requests || [])) {
    if (r.created_at >= thirtyDaysAgo) requests30++;
  }

  res.json({
    ok: true,
    stats: {
      totalClients: (clients || []).length,
      newClients30,
      requests30,
      revenue30,
      totalRevenue
    }
  });
});

app.post('/api/client/auth/request', limiterOtpRequest, async (req, res) => {
  console.log('[DEBUG] POST /api/client/auth/request received:', req.body);
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  if (!supabase) return res.status(500).json({ ok: false, error: 'DB not connected' });
  const { data: client } = await supabase.from('clients').select('*').eq('phone', phone).maybeSingle();
  if (!client) return res.status(404).json({ ok: false, error: 'client_not_found' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await supabase.from('auth_otps').upsert({ phone, code, expires_at: expiresAt });

  const bot        = await getBot();
  const chatId     = client.telegram_chat_id;
  let   deliveryMode = 'manual';

  if (bot && chatId) {
    try {
      bot.sendMessage(chatId,
        `🔐 <b>Код входа в AutoElectro:</b> <code>${code}</code>\n\nКод действителен 10 минут.`,
        { parse_mode: 'HTML' }
      );
      deliveryMode = 'telegram';
    } catch (e) {
      console.error('Telegram send error:', e.message);
    }
  }

  const exposeCode = deliveryMode === 'manual' && process.env.NODE_ENV !== 'production';
  res.json({
    ok:           true,
    deliveryMode,
    ...(exposeCode && { code }),
    telegramLinked: !!(chatId),
    clientName:   client.name,
  });
});

app.post('/api/client/auth', limiterOtpVerify, async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });

  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  const { data: otpRow } = await supabase.from('auth_otps').select('*').eq('phone', phone).maybeSingle();
  if (!otpRow) return res.status(400).json({ ok: false, error: 'code_expired' });
  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    await supabase.from('auth_otps').delete().eq('phone', phone);
    return res.status(401).json({ ok: false, error: 'code_expired' });
  }
  if (String(otpRow.code) !== String(code)) {
    return res.status(401).json({ ok: false, error: 'wrong_code' });
  }

  await supabase.from('auth_otps').delete().eq('phone', phone);

  const { data: client } = await supabase.from('clients').select('*').eq('phone', phone).maybeSingle();
  if (!client) return res.status(404).json({ ok: false, error: 'client_not_found' });

  const token = await createSession(client.id);
  res.json({ ok: true, token, clientId: client.id, name: client.name });
});

app.get('/api/client/auth/telegram/magic', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'DB not configured' });
  const bot = await getBot();
  if (!bot) return res.status(500).json({ error: 'Telegram bot not configured' });
  
  // Get bot username
  if (!cachedBotUsername) {
    try {
      const me = await bot.getMe();
      cachedBotUsername = me.username;
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch bot username' });
    }
  }

  // Generate session + 6-digit code
  const sessionId = crypto.randomBytes(16).toString('hex');
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 100000–999999

  const { error } = await supabase
    .from('auth_magic_links')
    .insert({ session_id: sessionId, code, status: 'pending' });

  if (error) {
    console.error('DB insert error:', error);
    return res.status(500).json({ error: 'DB Error: ' + error.message });
  }
  
  res.json({ sessionId, code, botUsername: cachedBotUsername });
});

app.get('/api/client/auth/telegram/magic/status', async (req, res) => {
  const { session } = req.query;
  if (!supabase) return res.json({ status: 'pending' });

  const { data: s } = await supabase
    .from('auth_magic_links')
    .select('*')
    .eq('session_id', session)
    .maybeSingle();

  if (!s) return res.json({ status: 'expired' });
  if (s.status === 'expired') return res.json({ status: 'expired' });
  
  // Also expire if older than 10 minutes
  if (s.status === 'pending') {
    const age = Date.now() - new Date(s.created_at).getTime();
    if (age > 10 * 60 * 1000) {
      await supabase.from('auth_magic_links').update({ status: 'expired' }).eq('session_id', session);
      return res.json({ status: 'expired' });
    }
  }
  
  if (s.status === 'approved') {
    const { data: client } = await supabase.from('clients').select('*').eq('id', s.client_id).maybeSingle();
    if (!client) return res.json({ status: 'expired' });

    await supabase.from('auth_magic_links').delete().eq('session_id', session);

    const token = await createSession(client.id);
    return res.json({ status: 'success', token });
  }
  res.json({ status: 'pending' });
});

app.get('/api/client/auth/vk/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/profile.html');

  try {
    const tokenUrl = `https://oauth.vk.com/access_token?client_id=${process.env.VK_APP_ID || VK_APP_ID}&client_secret=${process.env.VK_APP_SECRET || VK_APP_SECRET}&redirect_uri=${process.env.VK_REDIRECT_URI || VK_REDIRECT_URI}&code=${code}`;
    const tokenResponse = await new Promise((resolve, reject) => {
      https.get(tokenUrl, r => {
        let d = '';
        r.on('data', chunk => d += chunk);
        r.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    if (tokenResponse.error) {
      console.error('VK Token Error:', tokenResponse.error_description);
      return res.redirect('/profile.html?error=vk_token');
    }

    const { access_token, user_id, email } = tokenResponse;
    const vkId = String(user_id);

    const apiReqUrl = `https://api.vk.com/method/users.get?user_ids=${vkId}&fields=photo_100,contacts&access_token=${access_token}&v=5.199`;
    const apiResponse = await new Promise((resolve, reject) => {
      https.get(apiReqUrl, r => {
        let d = '';
        r.on('data', chunk => d += chunk);
        r.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const user = apiResponse.response?.[0];
    if (!user) return res.redirect('/profile.html?error=vk_api');

    if (!supabase) return res.redirect('/profile.html?error=db');
    let { data: client } = await supabase.from('clients').select('*').eq('vk_id', vkId).maybeSingle();

    if (!client) {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      client = {
        id: crypto.randomUUID(),
        name: name || 'VK Пользователь',
        phone: user.mobile_phone || user.home_phone || '',
        email: email || '',
        vk_id: vkId,
        telegram_id: '',
        telegram_username: '',
        telegram_chat_id: '',
        cars: [],
        repairs: [],
        created_at: new Date().toISOString()
      };
      await supabase.from('clients').insert(client);
    }

    const token = await createSession(client.id);
    res.redirect(`/profile.html?auth=vk&token=${token}&name=${encodeURIComponent(client.name)}`);

  } catch (err) {
    console.error('VK Callback Error:', err);
    res.redirect('/profile.html?error=internal');
  }
});

async function clientAuth(req, res, next) {
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
}

module.exports = app;


  // Graceful shutdown to stop Telegram polling and prevent 409 Conflicts on Railway restarts
  const shutdown = () => {
    if (tgBot) {
      console.log('Stopping Telegram polling...');
      tgBot.stopPolling().then(() => process.exit(0)).catch(() => process.exit(1));
    } else {
      process.exit(0);
    }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
