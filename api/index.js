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
const jwt         = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const JWT_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || 'secret-fallback-key';

/* ── VK ID / VK OAuth Credentials & Fallbacks ── */
const VK_APP_ID = process.env.VK_APP_ID || '54777601';
const VK_APP_SECRET = process.env.VK_APP_SECRET || 'OZR7Pd0txnsYunNPKBSu';
const VK_SERVICE_TOKEN = process.env.VK_SERVICE_TOKEN || '6aae6a7a6aae6a7a6aae6a7a9d69edbd7b66aae6aae6a7a0002bae5ba8df3e63de6749d';
const VK_REDIRECT_URI = process.env.VK_REDIRECT_URI || 'https://xn--c1adkgvmp7a.xn--p1ai/api/client/auth/vk/callback';
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
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, '../public');
const DATA_FILE  = path.join(__dirname, '../data/data.json');

/* ── Strict Public Landing DTO (whitelist-only, zero secrets or CRM leak) ── */
function publicLandingDto(data) {
  if (!data) return { settings: {}, services: [], reviews: [], contacts: {} };
  const settings = data.settings || {};
  const contacts = data.contacts || {};
  const services = (data.services || []).filter(s => s && s.active !== false);
  const reviews = data.reviews || [];

  return {
    settings: {
      heroTitle: settings.heroTitle || '',
      heroSubtitle: settings.heroSubtitle || '',
      acceptingRequests: !!settings.acceptingRequests,
      masterName: settings.masterName || 'Мастер',
      masterPhoto: settings.masterPhoto || '',
      masterStatus: settings.masterStatus || 'free'
    },
    contacts: {
      phone: contacts.phone || '',
      workingHours: contacts.workingHours || '',
      city: contacts.city || '',
      telegram: contacts.telegram || '',
      whatsapp: contacts.whatsapp || '',
      vk: contacts.vk || ''
    },
    services: services.map(s => ({
      id: String(s.id),
      title: s.title || '',
      description: s.description || '',
      price: s.price || '',
      icon: s.icon || 'wrench'
    })),
    reviews: reviews.map(r => ({
      id: String(r.id),
      name: r.name || '',
      text: r.text || '',
      image: r.image || ''
    }))
  };
}

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
    // NEVER use polling — it resets the production Telegram webhook!
    // Webhook mode only: Telegram pushes updates to /api/telegram-webhook
    tgBot = new TelegramBot(cachedToken);
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

  /* Any contact shared — link phone & auto-merge */
  bot.on('contact', async (msg) => {
    if (!msg.contact || !msg.contact.phone_number || !supabase) return;
    const phone = normalizePhone(msg.contact.phone_number);
    const chatId = msg.chat.id;
    const from = msg.from;

    let { data: phoneClient } = await supabase.from('clients').select('*').eq('phone', phone).maybeSingle();
    let { data: tgClient } = await supabase.from('clients').select('*').or(`telegram_id.eq.${String(from.id)},telegram_chat_id.eq.${String(chatId)}`).maybeSingle();

    if (phoneClient && tgClient && phoneClient.id !== tgClient.id) {
      await mergeClientAccounts(phoneClient.id, tgClient.id);
    } else if (phoneClient) {
      await supabase.from('clients').update({
        telegram_id: String(from.id),
        telegram_chat_id: String(chatId),
        telegram_username: from.username || ''
      }).eq('id', phoneClient.id);
    } else if (tgClient) {
      await supabase.from('clients').update({ phone }).eq('id', tgClient.id);
    }

    bot.sendMessage(chatId, `✅ Телефон ${phone} успешно подтвержден! Ваша сервисная книжка синхронизирована.`, {
      reply_markup: { remove_keyboard: true }
    });
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

/* ── Telegram HTML Escape (SEC: prevent HTML-injection in bot notifications) ── */
const escapeTgHtml = (str) => String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ── Phone normalization helper (RU + standard E.164) ── */
const normalizePhone = (phone) => {
  if (!phone) return '';
  const raw = String(phone).replace(/[\s\-()]/g, '');
  if (!raw) return '';
  if (raw.startsWith('8') && raw.length === 11) {
    return '+7' + raw.slice(1);
  }
  return raw.startsWith('+') ? raw : '+' + raw;
};

/* ── Deterministic 4-digit PIN for client self-service portal ── */
const getClientPin = (phone, clientId) => {
  const raw = normalizePhone(phone) || String(clientId || '');
  if (!raw) return '1111';
  const secret = process.env.JWT_SECRET || 'ae_pin_secret_key_2026';
  const hash = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const num = (parseInt(hash.slice(0, 8), 16) % 9000) + 1000; // strictly 4 digits: 1000..9999
  return String(num);
};

/* ── Smart Account Merge: Unify duplicate client records ── */
async function mergeClientAccounts(targetId, sourceId) {
  if (!supabase || !targetId || !sourceId || targetId === sourceId) return null;
  try {
    const [{ data: target }, { data: source }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', targetId).maybeSingle(),
      supabase.from('clients').select('*').eq('id', sourceId).maybeSingle()
    ]);

    if (!target || !source) return target || source;

    // Merge repairs deduplicating by id
    const existingRepairIds = new Set((target.repairs || []).map(r => String(r.id)));
    const mergedRepairs = [...(target.repairs || [])];
    for (const r of (source.repairs || [])) {
      if (!existingRepairIds.has(String(r.id))) {
        mergedRepairs.push(r);
        existingRepairIds.add(String(r.id));
      }
    }

    // Merge cars deduplicating by id or model+plate
    const existingCarKeys = new Set((target.cars || []).map(c => String(c.id || (c.model + (c.plate || '')))));
    const mergedCars = [...(target.cars || [])];
    for (const c of (source.cars || [])) {
      const k = String(c.id || (c.model + (c.plate || '')));
      if (!existingCarKeys.has(k)) {
        mergedCars.push(c);
        existingCarKeys.add(k);
      }
    }

    // Determine canonical name
    let finalName = target.name;
    const isGeneric = !finalName || finalName === 'Без имени' || finalName === 'Клиент' || finalName === 'Аноним' || finalName.startsWith('Клиент с сайта');
    if (isGeneric && source.name && source.name !== 'Без имени' && source.name !== 'Клиент') {
      finalName = source.name;
    }

    const upd = {
      name: finalName,
      phone: target.phone || source.phone || '',
      email: target.email || source.email || '',
      telegram_id: target.telegram_id || source.telegram_id || '',
      telegram_username: target.telegram_username || source.telegram_username || '',
      telegram_chat_id: target.telegram_chat_id || source.telegram_chat_id || '',
      vk_id: target.vk_id || source.vk_id || '',
      repairs: mergedRepairs,
      cars: mergedCars,
    };

    await supabase.from('clients').update(upd).eq('id', targetId);

    // Reassign any active sessions from source to target
    await supabase.from('auth_sessions').update({ client_id: targetId }).eq('client_id', sourceId);

    // Delete source client
    await supabase.from('clients').delete().eq('id', sourceId);

    return { ...target, ...upd };
  } catch (err) {
    console.error('[AccountMerge Error]', err);
    return null;
  }
}

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
const limiterTgAuth = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 30,
  message: { ok: false, error: 'too_many_requests' },
  standardHeaders: true, legacyHeaders: false,
});
const limiterTgMagicStatus = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 200, // позволяет опрос раз в 2-3 сек в течение 10 минут
  message: { status: 'rate_limited', error: 'too_many_requests' },
  standardHeaders: true, legacyHeaders: false,
});
const limiterVkAuth = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 30,
  message: { ok: false, error: 'too_many_requests', message: 'Слишком много попыток входа через VK. Попробуйте через 5 минут.' },
  standardHeaders: true, legacyHeaders: false,
});
const limiterPinAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { ok: false, error: 'too_many_requests', message: 'Слишком много попыток ввода ПИН-кода. Пожалуйста, подождите 15 минут.' },
  standardHeaders: true, legacyHeaders: false,
});

/* ── Official Telegram Widget Auth Validator (HMAC-SHA256, timing-safe) ── */
function verifyTelegramAuth(data, botToken) {
  if (!data || !data.hash || !botToken) return false;
  const checkHash = String(data.hash);

  // Expiration check: auth_date not older than 24 hours
  const authDate = parseInt(data.auth_date, 10);
  if (isNaN(authDate) || (Date.now() / 1000 - authDate) > 86400) {
    return false;
  }

  // Sort keys alphabetically excluding hash
  const keys = Object.keys(data).filter(k => k !== 'hash').sort();
  const dataCheckArr = keys.map(key => `${key}=${data[key]}`);
  const dataCheckString = dataCheckArr.join('\n');

  // SHA256 of botToken is the secret key
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  try {
    const hmacBuf = Buffer.from(hmac, 'utf8');
    const checkBuf = Buffer.from(checkHash, 'utf8');
    if (hmacBuf.length !== checkBuf.length) return false;
    return crypto.timingSafeEqual(hmacBuf, checkBuf);
  } catch {
    return false;
  }
}

/* ── Data helpers ── */

/* ── Telegram Webhook Secret Validator (timing-safe) ── */
function validateTelegramSecret(req) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true; // если секрет не задан в .env, разрешаем во время настройки
  const provided = req.headers['x-telegram-bot-api-secret-token'];
  if (!provided) return false;
  try {
    const a = Buffer.from(String(provided), 'utf8');
    const b = Buffer.from(String(expected), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

app.post('/api/telegram-webhook', async (req, res) => {
  if (!validateTelegramSecret(req)) {
    return res.status(403).json({ error: 'invalid_secret_token' });
  }
  // Respond 200 to Telegram after secret verification
  res.sendStatus(200);

  try {
    const bot = await getBot();
    if (!bot || !supabase) return;

    const update = req.body;
    if (!update.message) return;

    const msg    = update.message;
    const text   = (msg.text || '').trim();
    const contact = msg.contact;
    const chatId = msg.chat.id;
    const from   = msg.from;

    // ── Handle contact sharing (Level 2) ──
    if (contact && contact.phone_number) {
      const contactPhone = normalizePhone(contact.phone_number);
      let { data: phoneClient } = await supabase.from('clients').select('*').eq('phone', contactPhone).maybeSingle();
      let { data: tgClient } = await supabase.from('clients').select('*').or(`telegram_id.eq.${String(from.id)},telegram_chat_id.eq.${String(chatId)}`).maybeSingle();

      let finalClient = null;
      if (phoneClient && tgClient && phoneClient.id !== tgClient.id) {
        finalClient = await mergeClientAccounts(phoneClient.id, tgClient.id);
      } else if (phoneClient) {
        finalClient = phoneClient;
        await supabase.from('clients').update({
          telegram_id: String(from.id),
          telegram_chat_id: String(chatId),
          telegram_username: from.username || ''
        }).eq('id', phoneClient.id);
      } else if (tgClient) {
        finalClient = tgClient;
        await supabase.from('clients').update({ phone: contactPhone }).eq('id', tgClient.id);
      } else {
        finalClient = {
          id: crypto.randomUUID(),
          name: [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Клиент',
          phone: contactPhone,
          email: '', vk_id: '', cars: [], repairs: [],
          telegram_id: String(from.id),
          telegram_username: from.username || '',
          telegram_chat_id: String(chatId),
          created_at: new Date().toISOString()
        };
        await supabase.from('clients').insert([finalClient]);
      }

      // Approve any pending magic link session for this chat
      const { data: pendingSessions } = await supabase
        .from('auth_magic_links')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (pendingSessions && pendingSessions[0]) {
        await supabase.from('auth_magic_links').update({
          status: 'approved',
          client_id: finalClient.id
        }).eq('session_id', pendingSessions[0].session_id);
      }

      await bot.sendMessage(chatId,
        `✅ <b>Номер ${contactPhone} успешно подтвержден!</b>\n\n` +
        `Гараж и сервисная книжка синхронизированы. Вернитесь в браузер — страница уже обновилась!`,
        {
          parse_mode: 'HTML',
          reply_markup: { remove_keyboard: true }
        }
      );
      return;
    }

    // ── /start — welcome message with instructions ──
    if (text === '/start' || text === '/start ') {
      await bot.sendMessage(chatId,
        '👋 Привет! Это бот для входа в личный кабинет AutoElectro.\n\n' +
        '🔑 Как войти на сайт:\n' +
        '1. Откройте личный кабинет: https://auto-electrician-landing.vercel.app/profile.html\n' +
        '2. Нажмите «Войти через Telegram»\n' +
        '3. Нажмите кнопку «Открыть бота» на сайте, и вы будете авторизованы автоматически!'
      );
      return;
    }

    // ── Deep Link / Code auth ──
    let sessionCode = null;
    if (text.startsWith('/start auth_')) {
      sessionCode = text.split('auth_')[1];
    } else if (/^\d{6}$/.test(text)) {
      sessionCode = text; // backward compatibility
    } else if (text.startsWith('/start ')) {
      sessionCode = text.split('/start ')[1]; // generic start param
    }

    if (sessionCode) {
      sessionCode = sessionCode.trim();
      // SEC: Validate format to prevent PostgREST syntax injection
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionCode)) {
        await bot.sendMessage(chatId, '❌ Неверный формат кода авторизации.');
        return;
      }

      const { data: session, error: sessErr } = await supabase
        .from('auth_magic_links')
        .select('*')
        .or(`code.eq.${sessionCode},session_id.eq.${sessionCode}`)
        .eq('status', 'pending')
        .maybeSingle();

      if (sessErr || !session) {
        await bot.sendMessage(chatId,
          '❌ Ссылка устарела или недействительна.\n\n' +
          'Вернитесь на сайт и нажмите «Войти через Telegram» ещё раз.'
        );
        return;
      }

      // Check code hasn't expired (10 min)
      const created = new Date(session.created_at);
      if (Date.now() - created.getTime() > 10 * 60 * 1000) {
        await supabase.from('auth_magic_links').update({ status: 'expired' }).eq('session_id', session.session_id);
        await bot.sendMessage(chatId,
          '⏱ Ссылка истекла (10 минут). Вернитесь на сайт и запросите новую.'
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

      if (!client.phone) {
        await bot.sendMessage(chatId,
          `👋 <b>Здравствуйте, ${escapeTgHtml(from.first_name)}!</b>\n\n` +
          `Вы успешно вошли в личный кабинет AutoElectro.\n\n` +
          `💡 <i>Чтобы мы автоматически подтянули ваши автомобили и историю ремонтов от мастера, нажмите кнопку ниже:</i>`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              keyboard: [[{ text: '📱 Поделиться номером для поиска авто', request_contact: true }]],
              resize_keyboard: true,
              one_time_keyboard: true
            }
          }
        );
      } else {
        await bot.sendMessage(chatId,
          '✅ Вы успешно вошли в личный кабинет AutoElectro!\n\n' +
          '↩️ Вернитесь на страницу сайта — она обновится автоматически.',
          { reply_markup: { remove_keyboard: true } }
        );
      }
      return;
    }

    // ── Any other message ──
    await bot.sendMessage(chatId,
      '🤖 Я бот авторизации сайта AutoElectro.\n\n' +
      'Чтобы войти в личный кабинет:\n' +
      '1. Перейдите на сайт → Войти через Telegram\n' +
      '2. Нажмите кнопку входа и вас автоматически перекинет сюда для авторизации.'
    );

  } catch (err) {
    console.error('Webhook error:', err);
  }
});


/* ── Init bot on startup & ensure webhook is set on Vercel ── */
(async () => {
  try {
    const bot = await getBot();
    if (bot && process.env.VERCEL && cachedToken) {
      // Always re-set webhook on cold start — it gets reset on redeploy
      const webhookUrl = 'https://auto-electrician-landing.vercel.app/api/telegram-webhook';
      const r = await fetch(
        `https://api.telegram.org/bot${cachedToken}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl, drop_pending_updates: false, allowed_updates: ['message'] })
        }
      );
      const result = await r.json();
      addLog(`[TG] Webhook set on cold start: ${JSON.stringify(result)}`);
    }
  } catch (err) {
    addLog(`[TG] Bot Init Error: ${err.stack || err}`);
    console.error('Bot Init Error:', err);
  }
})();


/* ── ID generator ── */
const uid = () => crypto.randomBytes(8).toString('hex');

/* ── Session generator ── */
async function createSession(clientId) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('auth_sessions').insert({ token, client_id: clientId, expires_at: expiresAt });
  return token;
}

/* ── Middleware: Admin Auth Check ── */
const authCheck = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7).trim()
    : (authHeader || req.headers['x-admin-password']);

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.username) return res.status(401).json({ error: 'Unauthorized' });
    
    // Quick DB check to ensure master still exists (optional but good for security)
    const { data: m } = await supabase.from('masters').select('*').eq('username', decoded.username).maybeSingle();
    if (!m) return res.status(401).json({ error: 'Unauthorized' });
    
    req.master = m;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// 2. /api/data (Public Landing DTO)
app.get('/api/data', async (req, res) => {
  if (!supabase) {
    // Безопасный fallback из data/data.json при локальной разработке без Supabase
    try {
      if (fs.existsSync(DATA_FILE)) {
        const fileContent = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        return res.json(publicLandingDto(fileContent));
      }
    } catch {}
    return res.json(publicLandingDto({}));
  }

  try {
    const [settingsReq, servicesReq, reviewsReq, contactsReq] = await Promise.all([
      supabase.from('settings').select('*').maybeSingle(),
      supabase.from('services').select('*').eq('active', true).order('sort_order', { ascending: true }).order('id', { ascending: true }),
      supabase.from('reviews').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true }),
      supabase.from('contacts').select('*').maybeSingle()
    ]);
    const rawData = {
      settings: settingsReq.data?.data || {},
      services: servicesReq.data || [],
      reviews: reviewsReq.data || [],
      contacts: contactsReq.data?.data || {}
    };
    res.json(publicLandingDto(rawData));
  } catch (e) {
    res.json(publicLandingDto({}));
  }
});

app.post('/api/auth', limiterAdmin, async (req, res) => {
  const { username, password } = req.body;
  if (!password) return res.status(400).json({ ok: false, error: 'Введите пароль' });
  if (!supabase) return res.status(500).json({ ok: false, error: 'База данных недоступна' });

  // 1. Проверяем глобальный мастер-пароль из таблицы settings
  const { data: setRow } = await supabase.from('settings').select('data').limit(1).maybeSingle();
  const globalPassword = setRow?.data?.password || 'admin';
  const isGlobalMatch = (password === globalPassword);

  let master = null;
  const cleanUsername = username ? String(username).trim() : '';

  if (cleanUsername) {
    const { data: m } = await supabase.from('masters').select('*').eq('username', cleanUsername).maybeSingle();
    if (m) {
      const isHash = m.password && m.password.startsWith('$2');
      const directMatch = isHash ? bcrypt.compareSync(password, m.password) : (password === m.password);
      if (directMatch || isGlobalMatch) {
        master = m;
      }
    }
  } else {
    // Вход по одному только паролю (без логина)
    if (isGlobalMatch) {
      // Назначаем первого активного мастера
      const { data: firstMaster } = await supabase.from('masters').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
      master = firstMaster || { id: 'master_root', username: 'master' };
    } else {
      // Проверяем персональные пароли зарегистрированных мастеров
      const { data: allMasters } = await supabase.from('masters').select('*');
      if (allMasters && allMasters.length > 0) {
        for (const m of allMasters) {
          const isH = m.password && m.password.startsWith('$2');
          const match = isH ? bcrypt.compareSync(password, m.password) : (password === m.password);
          if (match) {
            master = m;
            break;
          }
        }
      }
    }
  }

  if (!master) return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' });

  const token = jwt.sign({ username: master.username, id: master.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ ok: true, token });
});

/* ── Protected Root Masters (Immutable Lead Accounts) ── */
const PROTECTED_MASTER_IDS = [
  '19e4e551-4454-4710-8a6d-a4effc211201', // Sid Vicious (CEO / Руководитель)
  '41dbea03-a28c-4d1e-bbf0-be86737301b5'  // Seryozhka Abisonov (Chief / Главный автоэлектрик)
];
const PROTECTED_MASTER_USERNAMES = [
  'vk_1125744855',
  'vk_250130315'
];

function isPrivilegedMaster(master) {
  if (!master) return false;
  return PROTECTED_MASTER_IDS.includes(String(master.id)) ||
         PROTECTED_MASTER_USERNAMES.includes(String(master.username));
}

/* ── Masters Management ── */
app.get('/api/masters', authCheck, async (req, res) => {
  if (!supabase) return res.json({ ok: true, masters: [] });
  const [mRes, sRes] = await Promise.all([
    supabase.from('masters').select('id, name, username, telegram_chat_id, created_at'),
    supabase.from('settings').select('*').maybeSingle()
  ]);
  const mastersMeta = sRes.data?.data?.masters_meta || {};
  const masters = (mRes.data || []).map(m => {
    const isProtected = PROTECTED_MASTER_IDS.includes(m.id) || PROTECTED_MASTER_USERNAMES.includes(m.username);
    const defaultRole = m.username === 'vk_1125744855' ? 'lead' : (m.username === 'vk_250130315' ? 'chief' : 'master');
    const meta = mastersMeta[m.id] || {};
    return {
      ...m,
      role: isProtected ? defaultRole : (meta.role || 'master'),
      phone: meta.phone || '',
      specialization: meta.specialization || '',
      notes: meta.notes || '',
      isProtected
    };
  });
  res.json({ ok: true, masters, currentMasterId: req.master?.id });
});

app.post('/api/masters', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: 'Database error' });
  if (!isPrivilegedMaster(req.master)) {
    return res.status(403).json({ ok: false, error: 'Доступ запрещён: только CEO или Главный мастер могут добавлять сотрудников' });
  }

  const { name, username, password, role, phone, specialization, notes } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ ok: false, error: 'Заполните обязательные поля (имя, логин, пароль)' });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ ok: false, error: 'Логин должен содержать минимум 3 символа' });
  }
  if (String(password).trim().length < 6) {
    return res.status(400).json({ ok: false, error: 'Пароль должен содержать минимум 6 символов' });
  }

  if (PROTECTED_MASTER_USERNAMES.includes(cleanUsername)) {
    return res.status(400).json({ ok: false, error: 'Этот логин зарезервирован для системного аккаунта' });
  }

  const { data: existing } = await supabase.from('masters').select('id').eq('username', cleanUsername).maybeSingle();
  if (existing) {
    return res.status(400).json({ ok: false, error: 'Сотрудник с таким логином уже существует' });
  }

  const hashedPassword = bcrypt.hashSync(String(password).trim(), 10);
  const { data, error } = await supabase.from('masters').insert({
    name: String(name).trim(),
    username: cleanUsername,
    password: hashedPassword
  }).select('id, name, username, telegram_chat_id, created_at').maybeSingle();

  if (error) return res.status(500).json({ ok: false, error: error.message });

  if (data?.id) {
    const { data: sRow } = await supabase.from('settings').select('*').maybeSingle();
    let currentSettings = sRow?.data || {};
    if (!currentSettings.masters_meta) currentSettings.masters_meta = {};
    const assignedRole = (role === 'lead' || role === 'chief') ? 'master' : (role || 'master');
    currentSettings.masters_meta[data.id] = {
      role: assignedRole,
      phone: phone ? String(phone).trim() : '',
      specialization: specialization ? String(specialization).trim() : '',
      notes: notes ? String(notes).trim() : ''
    };
    if (sRow) await supabase.from('settings').update({ data: currentSettings }).eq('id', sRow.id);
  }

  console.log(`[SECURITY] New master created: ${cleanUsername} by ${req.master?.username}`);
  res.json({ ok: true, master: data });
});

app.put('/api/masters/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: 'Database error' });
  const targetId = String(req.params.id);
  const isTargetProtected = PROTECTED_MASTER_IDS.includes(targetId);
  const isCallerPrivileged = isPrivilegedMaster(req.master);
  const isSelf = req.master && String(req.master.id) === targetId;

  if (isTargetProtected && !isCallerPrivileged && !isSelf) {
    return res.status(403).json({ ok: false, error: 'Доступ запрещён: недостаточно прав для редактирования системного аккаунта' });
  }
  if (!isCallerPrivileged && !isSelf) {
    return res.status(403).json({ ok: false, error: 'Доступ запрещён: редактировать карточку может только сам сотрудник или руководитель' });
  }

  const { name, username, password, role, phone, specialization, notes } = req.body;

  const updatePayload = {};
  if (name && String(name).trim()) {
    updatePayload.name = String(name).trim();
  }

  if (username && !isTargetProtected) {
    const cleanUser = String(username).trim().toLowerCase();
    if (cleanUser.length >= 3 && !PROTECTED_MASTER_USERNAMES.includes(cleanUser)) {
      updatePayload.username = cleanUser;
    }
  }

  let freshToken = null;
  if (password && typeof password === 'string' && password.trim() !== '') {
    const cleanPwd = password.trim();
    if (cleanPwd.length < 6) {
      return res.status(400).json({ ok: false, error: 'Пароль должен содержать не менее 6 символов' });
    }
    updatePayload.password = bcrypt.hashSync(cleanPwd, 10);
    if (isSelf) {
      freshToken = jwt.sign({ username: updatePayload.username || req.master.username, id: req.master.id }, JWT_SECRET, { expiresIn: '30d' });
    }
    console.log(`[SECURITY] Password updated for master ${targetId} by ${req.master?.username}`);
  }

  if (Object.keys(updatePayload).length > 0) {
    await supabase.from('masters').update(updatePayload).eq('id', targetId);
  }

  const { data: sRow } = await supabase.from('settings').select('*').maybeSingle();
  let currentSettings = sRow?.data || {};
  if (!currentSettings.masters_meta) currentSettings.masters_meta = {};

  let finalRole = currentSettings.masters_meta[targetId]?.role || (targetId === '19e4e551-4454-4710-8a6d-a4effc211201' ? 'lead' : (targetId === '41dbea03-a28c-4d1e-bbf0-be86737301b5' ? 'chief' : 'master'));
  if (isTargetProtected) {
    finalRole = targetId === '19e4e551-4454-4710-8a6d-a4effc211201' ? 'lead' : 'chief';
  } else if (role && isCallerPrivileged) {
    finalRole = (role === 'lead' || role === 'chief') ? 'master' : role;
  }

  currentSettings.masters_meta[targetId] = {
    ...(currentSettings.masters_meta[targetId] || {}),
    role: finalRole,
    phone: phone !== undefined ? String(phone).trim() : (currentSettings.masters_meta[targetId]?.phone || ''),
    specialization: specialization !== undefined ? String(specialization).trim() : (currentSettings.masters_meta[targetId]?.specialization || ''),
    notes: notes !== undefined ? String(notes).trim() : (currentSettings.masters_meta[targetId]?.notes || '')
  };

  if (sRow) await supabase.from('settings').update({ data: currentSettings }).eq('id', sRow.id);

  const { data: updatedMaster } = await supabase.from('masters').select('id, name, username, telegram_chat_id, created_at').eq('id', targetId).maybeSingle();

  res.json({
    ok: true,
    master: {
      ...updatedMaster,
      ...currentSettings.masters_meta[targetId],
      isProtected: isTargetProtected
    },
    ...(freshToken ? { token: freshToken } : {})
  });
});

app.delete('/api/masters/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const targetId = String(req.params.id);

  if (!isPrivilegedMaster(req.master)) {
    return res.status(403).json({ ok: false, error: 'Доступ запрещён: только CEO или Главный мастер могут удалять сотрудников' });
  }

  if (PROTECTED_MASTER_IDS.includes(targetId)) {
    console.warn(`[SECURITY ALERT] Blocked deletion attempt on protected master ID: ${targetId} by ${req.master?.username}`);
    return res.status(403).json({ ok: false, error: 'Этот аккаунт мастера защищён от удаления' });
  }

  const { data: targetMaster } = await supabase.from('masters').select('id, username').eq('id', targetId).maybeSingle();
  if (targetMaster && PROTECTED_MASTER_USERNAMES.includes(targetMaster.username)) {
    console.warn(`[SECURITY ALERT] Blocked deletion attempt on protected master username: ${targetMaster.username} by ${req.master?.username}`);
    return res.status(403).json({ ok: false, error: 'Этот аккаунт мастера защищён от удаления' });
  }

  if (req.master && String(req.master.id) === targetId) {
    return res.status(400).json({ ok: false, error: 'cannot_delete_self' });
  }

  const { error } = await supabase.from('masters').delete().eq('id', targetId);
  if (error) return res.status(500).json({ ok: false, error: error.message });

  const { data: sRow } = await supabase.from('settings').select('*').maybeSingle();
  if (sRow?.data?.masters_meta && sRow.data.masters_meta[targetId]) {
    const currentSettings = sRow.data;
    delete currentSettings.masters_meta[targetId];
    await supabase.from('settings').update({ data: currentSettings }).eq('id', sRow.id);
  }

  console.log(`[SECURITY] Master ${targetId} deleted by ${req.master?.username}`);
  res.json({ ok: true });
});

app.put('/api/settings', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: sRow } = await supabase.from('settings').select('*').maybeSingle();
  let currentSettings = sRow?.data || {};
  
  const { password: newPwd, telegramBotToken: newToken, ...rest } = req.body;
  currentSettings = { ...currentSettings, ...rest };
  
  // BUG FIX: master password update goes to masters table, not settings (SEC-07)
  let newToken_jwt = null;
  if (newPwd && req.master) {
    const hashedPassword = bcrypt.hashSync(newPwd, 10);
    await supabase.from('masters').update({ password: hashedPassword }).eq('id', req.master.id);
    // Issue a fresh JWT so the admin session remains valid after password change
    newToken_jwt = jwt.sign({ username: req.master.username, id: req.master.id }, JWT_SECRET, { expiresIn: '30d' });
  }
  
  // BUG FIX (P0): Do NOT wipe telegramBotToken if an empty string or undefined was sent
  if (newToken !== undefined && typeof newToken === 'string' && newToken.trim() !== '') {
    const cleanToken = newToken.trim();
    if (cleanToken !== currentSettings.telegramBotToken) {
      currentSettings.telegramBotToken = cleanToken;
      if (tgBot) { try { tgBot.stopPolling(); } catch {} tgBot = null; }
      setTimeout(async () => { try { await getBot(); } catch {} }, 500);
    }
  }
  
  if (sRow) await supabase.from('settings').update({ data: currentSettings }).eq('id', sRow.id);
  else await supabase.from('settings').insert({ data: currentSettings });
  
  res.json({ ok: true, ...(newToken_jwt ? { token: newToken_jwt } : {}) });
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

/* ── Admin: GET /api/services — all services (incl. inactive) for admin panel ── */
app.get('/api/services', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: services } = await supabase.from('services').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true });
  res.json({ ok: true, services: services || [] });
});

app.post('/api/services', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const service = req.body;
  if (service.active === undefined) service.active = true;
  
  let sort_order = undefined;
  if (service.sortOrder !== undefined && service.sortOrder !== null && service.sortOrder !== '') {
    sort_order = Number(service.sortOrder);
  } else if (service.sort_order !== undefined && service.sort_order !== null && service.sort_order !== '') {
    sort_order = Number(service.sort_order);
  }

  if (service.id) {
    if (sort_order === undefined || isNaN(sort_order)) {
      const { data: existing } = await supabase.from('services').select('sort_order').eq('id', service.id).maybeSingle();
      sort_order = (existing?.sort_order !== undefined && existing?.sort_order !== null) ? existing.sort_order : 0;
    }
  } else {
    if (sort_order === undefined || isNaN(sort_order)) {
      const { data: allSvc } = await supabase.from('services').select('sort_order').order('sort_order', { ascending: false }).limit(1);
      const maxOrder = allSvc?.[0]?.sort_order ?? -1;
      sort_order = maxOrder + 1;
    }
  }

  const payload = {
    id: service.id || String(Date.now()),
    title: service.title,
    description: service.description,
    icon: service.icon,
    price: service.price,
    active: service.active,
    sort_order: (sort_order !== undefined && !isNaN(sort_order)) ? sort_order : 0
  };
  await supabase.from('services').upsert(payload);
  const { data: services } = await supabase.from('services').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true });
  res.json({ ok: true, services: services || [] });
});

app.put('/api/services/reorder', authCheck, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !supabase) return res.status(400).json({ error: 'ids required' });
  for (let i = 0; i < ids.length; i++) {
    await supabase.from('services').update({ sort_order: i }).eq('id', ids[i]);
  }
  const { data: services } = await supabase.from('services').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true });
  res.json({ ok: true, services: services || [] });
});

app.delete('/api/services/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  await supabase.from('services').delete().eq('id', req.params.id);
  const { data: services } = await supabase.from('services').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true });
  res.json({ ok: true, services: services || [] });
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

app.put('/api/reviews/reorder', authCheck, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !supabase) return res.status(400).json({ error: 'ids required' });
  for (let i = 0; i < ids.length; i++) {
    await supabase.from('reviews').update({ sort_order: i }).eq('id', ids[i]);
  }
  const { data: reviews } = await supabase.from('reviews').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true });
  res.json({ ok: true, reviews });
});

app.put('/api/reviews/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const payload = {};
  if (req.body.name !== undefined) payload.name = req.body.name;
  if (req.body.text !== undefined) payload.text = req.body.text;
  if (req.body.image !== undefined) payload.image = req.body.image;
  
  await supabase.from('reviews').update(payload).eq('id', req.params.id);
  const { data: review } = await supabase.from('reviews').select('*').eq('id', req.params.id).maybeSingle();
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

app.post('/api/requests', limiterPublic, async (req, res) => {
  const { name, phone, problem } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });
  if (!supabase) return res.status(500).json({ error: 'DB error' });
  
  const cleanPhone = normalizePhone(phone);

  // Level 4: Pre-create or link client so repairs and guest session are instantly ready
  let client = null;
  const { data: existingClient } = await supabase.from('clients').select('*').eq('phone', cleanPhone).maybeSingle();
  if (existingClient) {
    client = existingClient;
  } else {
    const newClient = {
      id: uid(),
      name: name || 'Клиент с сайта',
      phone: cleanPhone,
      email: '',
      vk_id: '',
      telegram_id: '',
      telegram_username: '',
      telegram_chat_id: '',
      cars: [],
      repairs: [],
      created_at: new Date().toISOString()
    };
    await supabase.from('clients').insert([newClient]);
    client = newClient;
  }

  const sessionToken = await createSession(client.id);

  const payload = {
    id: uid(),
    name: name || client.name || 'Без имени',
    phone: cleanPhone || phone || '',
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
            `📥 <b>Новая заявка!</b>\n👤 ${escapeTgHtml(payload.name)}\n📞 ${escapeTgHtml(payload.phone)}\n🔧 ${escapeTgHtml(payload.problem) || '—'}`,
            { parse_mode: 'HTML' }
          ).catch(()=>{});
        }
      }
    }
  } catch {}

  res.json({
    ok: true,
    id: payload.id,
    token: sessionToken,
    clientId: client.id,
    pin: getClientPin(client.phone, client.id)
  });
});

app.get('/api/requests', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: requests } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
  // Map snake_case created_at → camelCase createdAt for frontend compatibility
  const mapped = (requests || []).map(r => ({ ...r, createdAt: r.created_at }));
  res.json({ ok: true, requests: mapped });
});

app.put('/api/requests/:id/status', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { status } = req.body;
  await supabase.from('requests').update({ status }).eq('id', req.params.id);
  const { data: request } = await supabase.from('requests').select('*').eq('id', req.params.id).maybeSingle();
  const mapped = request ? { ...request, createdAt: request.created_at } : null;
  res.json({ ok: true, request: mapped });
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

  // Пароли и токены мастера никогда не возвращаются клиенту (SEC-05)
  res.json({ ok: true, client });
});

app.post('/api/client/profile/phone', clientAuth, async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\+?[0-9]{10,15}$/.test(phone.replace(/[\s\-()]/g, ''))) {
    return res.status(400).json({ ok: false, error: 'invalid_phone' });
  }
  
  const cleanPhone = normalizePhone(phone);

  if (!supabase) return res.status(500).json({ ok: false });

  // Check if another client already exists with this phone (e.g. created by master)
  const { data: existingWithPhone } = await supabase.from('clients').select('*').eq('phone', cleanPhone).maybeSingle();
  if (existingWithPhone && existingWithPhone.id !== req.clientId) {
    // Smart merge: merge current temporary client into master's client record
    const merged = await mergeClientAccounts(existingWithPhone.id, req.clientId);
    const newToken = await createSession(existingWithPhone.id);
    return res.json({ ok: true, phone: cleanPhone, merged: true, token: newToken, clientId: existingWithPhone.id });
  }

  await supabase.from('clients').update({ phone: cleanPhone }).eq('id', req.clientId);
  res.json({ ok: true, phone: cleanPhone });
});

app.get('/api/client/me', clientAuth, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.clientId).maybeSingle();
  if (!client) return res.status(404).json({ error: 'Not found' });

  const { accessCode, telegram_chat_id, ...safeClient } = client;
  safeClient.pin = getClientPin(client.phone, client.id);
  const repairCount = (client.repairs || []).filter(r => r.type !== 'Напоминание').length;
  
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

  // Проверяем, является ли данный клиент Мастером
  let adminToken = null;
  try {
    const vkUsername = client.vk_id ? `vk_${client.vk_id}` : null;
    const tgUsername = client.telegram_id ? `tg_${client.telegram_id}` : null;
    let conditions = [];
    conditions.push(`id.eq.${client.id}`);
    if (vkUsername) conditions.push(`username.eq.${vkUsername}`);
    if (tgUsername) conditions.push(`username.eq.${tgUsername}`);
    if (client.telegram_chat_id) conditions.push(`telegram_chat_id.eq.${client.telegram_chat_id}`);
    
    const { data: masterRec } = await supabase.from('masters').select('*').or(conditions.join(',')).maybeSingle();

    if (masterRec) {
      adminToken = jwt.sign({ username: masterRec.username, id: masterRec.id }, JWT_SECRET, { expiresIn: '30d' });
    }
  } catch (err) {
    console.error('Error checking master status in /api/client/me:', err);
  }

  res.json({ ok: true, client: safeClient, masterInfo, ...(adminToken ? { adminToken } : {}) });
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
  const { data: clients, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: error.message });
  const enriched = (clients || []).map(c => ({
    ...c,
    pin: getClientPin(c.phone, c.id)
  }));
  res.json({ ok: true, clients: enriched });
});

app.post('/api/clients', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { name, phone, email, cars } = req.body;
  const cleanPhone = normalizePhone(phone);

  if (cleanPhone) {
    const { data: existing } = await supabase.from('clients').select('id, name').eq('phone', cleanPhone).maybeSingle();
    if (existing) {
      return res.status(400).json({ ok: false, error: 'client_exists' });
    }
  }

  const payload = {
    id: uid(),
    name: name || 'Аноним',
    phone: cleanPhone || phone || '',
    email: email || '',
    vk_id: '',
    telegram_id: '',
    telegram_username: '',
    telegram_chat_id: '',
    cars: Array.isArray(cars) ? cars : [],
    repairs: [],
    created_at: new Date().toISOString()
  };
  const { error: insErr } = await supabase.from('clients').insert(payload);
  if (insErr) return res.status(500).json({ ok: false, error: insErr.message });
  payload.pin = getClientPin(payload.phone, payload.id);
  res.json({ ok: true, client: payload });
});

app.get('/api/clients/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).maybeSingle();
  if (!client) return res.status(404).json({ error: 'Not found' });
  client.pin = getClientPin(client.phone, client.id);
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
  if (client) client.pin = getClientPin(client.phone, client.id);
  res.json({ ok: true, client });
});

app.delete('/api/clients/:id', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  await supabase.from('clients').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

/* ── Magic Link for client access from CRM ── */
app.get('/api/clients/:id/magic-link', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: 'db_unavailable' });
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).maybeSingle();
  if (!client) return res.status(404).json({ ok: false, error: 'Клиент не найден' });

  const token = await createSession(client.id);
  const pin = getClientPin(client.phone, client.id);
  const baseUrl = 'https://xn--c1adkgvmp7a.xn--p1ai'; // чекгорит.рф
  const magicUrl = `${baseUrl}/profile.html?auth=${token}`;
  res.json({ ok: true, magicUrl, token, pin, name: client.name, phone: client.phone });
});

/* ── Cars ── */
app.post('/api/clients/:id/cars', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: client, error } = await supabase.from('clients').select('cars').eq('id', req.params.id).maybeSingle();
  if (error || !client) return res.status(404).json({ error: 'Client not found' });

  const cars = Array.isArray(client.cars) ? client.cars : [];
  const carId = req.body.id || req.body.cid || uid();
  const newCar = {
    id: carId,
    brand: req.body.brand || req.body.make || '',
    model: req.body.model || '',
    year: req.body.year || '',
    plate: req.body.plate || req.body.vin || '',
    status: req.body.status || 'ok'
  };

  const existingIdx = cars.findIndex(c => c.id === carId);
  if (existingIdx >= 0) {
    cars[existingIdx] = { ...cars[existingIdx], ...newCar };
  } else {
    cars.push(newCar);
  }

  await supabase.from('clients').update({ cars }).eq('id', req.params.id);
  res.json({ ok: true, cars });
});

app.delete('/api/clients/:id/cars/:cid', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: client, error } = await supabase.from('clients').select('cars').eq('id', req.params.id).maybeSingle();
  if (error || !client) return res.status(404).json({ error: 'Client not found' });

  const cars = (client.cars || []).filter(c => c.id !== req.params.cid && c.cid !== req.params.cid);
  await supabase.from('clients').update({ cars }).eq('id', req.params.id);
  res.json({ ok: true, cars });
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

  if (req.body.reminderDate) {
    repair.reminder = {
      date: req.body.reminderDate,
      text: req.body.reminderText || '',
      done: false
    };
  }

  const { data: client } = await supabase.from('clients').select('repairs').eq('id', req.params.id).maybeSingle();
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const updatedRepairs = [...(client.repairs || []), repair];
  
  await supabase.from('clients').update({ repairs: updatedRepairs }).eq('id', req.params.id);
  res.json({ ok: true, repair });
});

app.delete('/api/clients/:id/repairs/:rid', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const { data: client } = await supabase.from('clients').select('repairs').eq('id', req.params.id).maybeSingle();
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

// SEC-08: /api/debug удален. /api/logs защищен проверкой прав администратора
app.get('/api/logs', authCheck, async (req, res) => {
  res.json(memLogs);
});

app.get('/api/analytics', authCheck, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false });
  const [{ data: clients }, { data: requests }] = await Promise.all([
    supabase.from('clients').select('*'),
    supabase.from('requests').select('*')
  ]);

  const clientList = clients || [];
  const requestList = requests || [];

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  
  let monthVisits = 0;
  let monthRevenue = 0;
  let totalRevenue = 0;
  const serviceFreq = {};
  const visitsByMonth = {};

  for (const c of clientList) {
    for (const r of (c.repairs || [])) {
      if (r.type === 'Напоминание') continue;
      const cost = Number(r.cost) || 0;
      totalRevenue += cost;
      if (r.date && r.date >= thirtyDaysAgo) {
        monthVisits++;
        monthRevenue += cost;
      }
      if (r.type) serviceFreq[r.type] = (serviceFreq[r.type] || 0) + 1;
      if (r.date) {
        const m = r.date.slice(0, 7);
        visitsByMonth[m] = (visitsByMonth[m] || 0) + 1;
      }
    }
  }

  const churnCutoff = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
  const churnClients = clientList.filter(c => {
    const repairs = (c.repairs || []).filter(r => r.type !== 'Напоминание');
    if (!repairs.length) return false;
    // Sort by date to get the actual last repair (not just last array element)
    const sorted = [...repairs].filter(r => r.date).sort((a, b) => a.date > b.date ? -1 : 1);
    if (!sorted.length) return false;
    return sorted[0].date < churnCutoff;
  }).map(c => {
    const sorted = [...(c.repairs || [])].filter(r => r.type !== 'Напоминание' && r.date).sort((a, b) => a.date > b.date ? -1 : 1);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      lastRepairDate: sorted[0]?.date || null
    };
  });

  const newRequests = requestList.filter(r => r.status === 'new').length;

  res.json({
    ok: true,
    totalClients: clientList.length,
    newRequests,
    monthVisits,
    monthRevenue,
    avgCheck: monthVisits ? Math.round(monthRevenue / monthVisits) : 0,
    churnCount: churnClients.length,
    churnClients,
    visitsByMonth,
    serviceFreq,
    stats: {
      totalClients: clientList.length,
      newRequests,
      monthVisits,
      monthRevenue,
      totalRevenue
    }
  });
});

/* ── Level 5: Phone + 4-digit PIN Authentication ── */
app.post('/api/client/auth/pin', limiterPinAuth, async (req, res) => {
  const { phone, pin } = req.body;
  if (!phone || !pin) {
    return res.status(400).json({ ok: false, error: 'missing_fields', message: 'Введите номер телефона и 4-значный ПИН-код' });
  }
  if (!supabase) return res.status(503).json({ ok: false, error: 'db_unavailable', message: 'База данных временно недоступна' });

  const cleanPhone = normalizePhone(phone);
  let { data: client } = await supabase.from('clients').select('*').eq('phone', cleanPhone).maybeSingle();
  if (!client && cleanPhone !== phone) {
    const { data: c2 } = await supabase.from('clients').select('*').eq('phone', phone).maybeSingle();
    if (c2) client = c2;
  }

  if (!client) {
    return res.status(404).json({
      ok: false,
      error: 'client_not_found',
      message: 'Клиент с таким номером телефона не найден. Оставьте заявку на сайте или обратитесь к мастеру.'
    });
  }

  const expectedPin = getClientPin(client.phone, client.id);
  if (String(pin).trim() !== expectedPin) {
    return res.status(401).json({
      ok: false,
      error: 'wrong_pin',
      message: 'Неверный ПИН-код. Уточните 4-значный код у мастера или в вашем заказ-наряде.'
    });
  }

  const token = await createSession(client.id);
  res.json({ ok: true, token, clientId: client.id, name: client.name });
});

app.post('/api/client/auth/request', limiterOtpRequest, async (req, res) => {
  console.log('[DEBUG] POST /api/client/auth/request received:', req.body);
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  if (!supabase) return res.status(500).json({ ok: false, error: 'DB not connected' });
  const cleanPhone = normalizePhone(phone);
  let { data: client } = await supabase.from('clients').select('*').eq('phone', cleanPhone).maybeSingle();
  if (!client && cleanPhone !== phone) {
    const { data: c2 } = await supabase.from('clients').select('*').eq('phone', phone).maybeSingle();
    if (c2) client = c2;
  }
  if (!client) return res.status(404).json({ ok: false, error: 'client_not_found' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await supabase.from('auth_otps').upsert({ phone: cleanPhone, code, expires_at: expiresAt });

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
  const cleanPhone = normalizePhone(phone);
  let { data: otpRow } = await supabase.from('auth_otps').select('*').eq('phone', cleanPhone).maybeSingle();
  if (!otpRow && cleanPhone !== phone) {
    const { data: o2 } = await supabase.from('auth_otps').select('*').eq('phone', phone).maybeSingle();
    if (o2) otpRow = o2;
  }

  if (!otpRow) return res.status(400).json({ ok: false, error: 'code_expired' });
  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    await supabase.from('auth_otps').delete().eq('phone', cleanPhone);
    if (cleanPhone !== phone) await supabase.from('auth_otps').delete().eq('phone', phone);
    return res.status(401).json({ ok: false, error: 'code_expired' });
  }
  if (String(otpRow.code) !== String(code)) {
    return res.status(401).json({ ok: false, error: 'wrong_code' });
  }

  await supabase.from('auth_otps').delete().eq('phone', cleanPhone);
  if (cleanPhone !== phone) await supabase.from('auth_otps').delete().eq('phone', phone);

  let { data: client } = await supabase.from('clients').select('*').eq('phone', cleanPhone).maybeSingle();
  if (!client && cleanPhone !== phone) {
    const { data: c2 } = await supabase.from('clients').select('*').eq('phone', phone).maybeSingle();
    if (c2) client = c2;
  }
  if (!client) return res.status(404).json({ ok: false, error: 'client_not_found' });

  const token = await createSession(client.id);
  res.json({ ok: true, token, clientId: client.id, name: client.name });
});

/* ── 0. Telegram Silent Web OAuth Config (bot_id for browser popup) ── */
app.get('/api/client/auth/telegram/config', async (req, res) => {
  const bot = await getBot();
  if (!cachedToken) {
    return res.status(503).json({ ok: false, error: 'bot_not_configured' });
  }
  const botId = cachedToken.split(':')[0];
  if (!cachedBotUsername && bot) {
    try {
      const me = await bot.getMe();
      cachedBotUsername = me.username;
    } catch {}
  }
  res.json({ ok: true, botId, botUsername: cachedBotUsername || 'Autoelectrical_Official_bot' });
});

/* ── 1. Telegram Official Login Widget Auth (HMAC-SHA256 verified) ── */
app.post('/api/client/auth/telegram', limiterTgAuth, async (req, res) => {
  const bot = await getBot();
  if (!cachedToken) return res.status(500).json({ ok: false, error: 'bot_not_configured' });

  const isValid = verifyTelegramAuth(req.body, cachedToken);
  if (!isValid) {
    return res.status(403).json({ ok: false, error: 'invalid_telegram_signature' });
  }

  const { id: tgId, first_name, last_name, username } = req.body;
  if (!tgId) return res.status(400).json({ ok: false, error: 'missing_id' });

  if (!supabase) {
    return res.status(503).json({
      ok: false,
      error: 'db_unavailable',
      message: 'База данных временно недоступна. Пожалуйста, попробуйте позже.'
    });
  }

  try {
    let { data: client, error: findErr } = await supabase
      .from('clients')
      .select('*')
      .or(`telegram_id.eq.${tgId},telegram_chat_id.eq.${tgId}`)
      .maybeSingle();

    if (findErr) {
      console.error('Find client error:', findErr);
      const isDbDown = findErr.message && (findErr.message.includes('fetch failed') || findErr.message.includes('ENOTFOUND'));
      return res.status(503).json({
        ok: false,
        error: isDbDown ? 'db_paused' : 'db_error',
        message: isDbDown
          ? 'База данных Supabase приостановлена. Пожалуйста, возобновите проект в панели управления.'
          : findErr.message
      });
    }

    if (!client) {
      const name = [first_name, last_name].filter(Boolean).join(' ') || (username ? `@${username}` : `Пользователь ${tgId}`);
      const newClient = {
        id: crypto.randomUUID(),
        name,
        phone: '',
        email: '',
        vk_id: '',
        telegram_id: String(tgId),
        telegram_username: username || '',
        telegram_chat_id: String(tgId),
        cars: [],
        repairs: [],
        created_at: new Date().toISOString()
      };
      const { error: insErr } = await supabase.from('clients').insert([newClient]);
      if (insErr) {
        return res.status(500).json({ ok: false, error: 'db_error', message: insErr.message });
      }
      client = newClient;
    } else {
      const upd = {};
      if (!client.telegram_id) upd.telegram_id = String(tgId);
      if (!client.telegram_chat_id) upd.telegram_chat_id = String(tgId);
      if (username && client.telegram_username !== username) upd.telegram_username = username;
      if (Object.keys(upd).length > 0) {
        await supabase.from('clients').update(upd).eq('id', client.id);
      }
    }

    const token = await createSession(client.id);
    res.json({ ok: true, token, clientId: client.id, name: client.name });
  } catch (err) {
    console.error('Telegram widget auth error:', err);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

/* ── 1.1 Demo Client Sandbox Login (1-click client testing) ── */
app.post('/api/client/auth/demo', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'db_unavailable', message: 'База данных временно недоступна' });
  }

  try {
    const DEMO_CLIENT_ID = 'demo-client-sandbox-777';
    let { data: client, error: findErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', DEMO_CLIENT_ID)
      .maybeSingle();

    if (findErr) {
      console.error('Demo client find error:', findErr);
    }

    if (!client) {
      const demoClient = {
        id: DEMO_CLIENT_ID,
        name: 'Иван Тестовый (Демо)',
        phone: '+7 (999) 777-00-11',
        email: 'demo@autoelectro.local',
        vk_id: '',
        telegram_id: '',
        telegram_username: 'demo_client',
        telegram_chat_id: '',
        cars: [
          { id: 'car-demo-1', make: 'Toyota', model: 'Camry', year: 2019, vin: 'JTDBU40E190123456', plate: 'А777АА 181' },
          { id: 'car-demo-2', make: 'Renault', model: 'Duster', year: 2016, vin: 'VF1HSRAD450987654', plate: 'В555ВВ 181' }
        ],
        repairs: [
          {
            id: 'rep-demo-1',
            date: '2026-08-15',
            car: 'Toyota Camry (А777АА 181)',
            type: 'Ремонт автоэлектрики',
            desc: 'Диагностика системы зажигания, устранение обрыва цепи питания катушки 3-го цилиндра',
            cost: 3500,
            warranty: '6 месяцев (до 15.02.2027)'
          },
          {
            id: 'rep-demo-2',
            date: '2026-09-02',
            car: 'Toyota Camry (А777АА 181)',
            type: 'Диагностика',
            desc: 'Компьютерная диагностика электронных блоков (ЭБУ), адаптация дроссельной заслонки',
            cost: 1500,
            warranty: 'Гарантия на выполненные работы 30 дней'
          },
          {
            id: 'rep-demo-3',
            date: '2026-09-10',
            car: 'Toyota Camry (А777АА 181)',
            type: 'Напоминание',
            desc: 'Рекомендуется плановая проверка емкости АКБ перед зимним сезоном',
            cost: 0,
            warranty: ''
          }
        ],
        created_at: new Date().toISOString()
      };
      await supabase.from('clients').insert([demoClient]);
      client = demoClient;
    }

    const token = await createSession(client.id);
    res.json({ ok: true, token, clientId: client.id, name: client.name });
  } catch (err) {
    console.error('Demo auth error:', err);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

/* ── 2. Telegram One-Click Magic Link Generation ── */
app.get('/api/client/auth/telegram/magic', limiterTgAuth, async (req, res) => {
  if (!supabase) {
    return res.status(503).json({
      ok: false,
      error: 'db_unavailable',
      message: 'База данных не настроена.'
    });
  }

  const bot = await getBot();
  if (!bot) {
    return res.status(503).json({
      ok: false,
      error: 'bot_not_configured',
      message: 'Telegram бот не настроен или токен не задан.'
    });
  }

  // Get bot username
  if (!cachedBotUsername) {
    try {
      const me = await bot.getMe();
      cachedBotUsername = me.username;
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: 'bot_error',
        message: 'Не удалось получить данные бота Telegram'
      });
    }
  }

  // Generate 256-bit cryptographically secure session + 6-digit code
  const sessionId = crypto.randomBytes(32).toString('hex');
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 100000–999999

  try {
    const { error } = await supabase
      .from('auth_magic_links')
      .insert({ session_id: sessionId, code, status: 'pending' });

    if (error) {
      console.error('DB insert magic link error:', error);
      const isDbDown = error.message && (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND'));
      return res.status(503).json({
        ok: false,
        error: isDbDown ? 'db_paused' : 'db_error',
        message: isDbDown
          ? 'База данных Supabase приостановлена. Если вы администратор, возобновите проект в панели управления Supabase.'
          : ('Ошибка БД: ' + error.message)
      });
    }

    res.json({ ok: true, sessionId, code, botUsername: cachedBotUsername });
  } catch (err) {
    console.error('Magic link unexpected error:', err);
    const isDbDown = err.message && (err.message.includes('fetch failed') || err.message.includes('ENOTFOUND'));
    res.status(503).json({
      ok: false,
      error: isDbDown ? 'db_paused' : 'internal_error',
      message: isDbDown
        ? 'База данных Supabase приостановлена. Если вы администратор, возобновите проект в панели управления Supabase.'
        : 'Внутренняя ошибка сервера при создании сессии'
    });
  }
});

/* ── 3. Telegram Magic Link Status Polling ── */
app.get('/api/client/auth/telegram/magic/status', limiterTgMagicStatus, async (req, res) => {
  const { session } = req.query;
  if (!session || typeof session !== 'string') {
    return res.status(400).json({ status: 'invalid_session' });
  }

  if (!supabase) return res.json({ status: 'pending' });

  try {
    const { data: s, error } = await supabase
      .from('auth_magic_links')
      .select('*')
      .eq('session_id', session)
      .maybeSingle();

    if (error || !s) return res.json({ status: 'expired' });
    if (s.status === 'expired') return res.json({ status: 'expired' });

    // Expire if older than 10 minutes
    if (s.status === 'pending') {
      const age = Date.now() - new Date(s.created_at).getTime();
      if (age > 10 * 60 * 1000) {
        await supabase.from('auth_magic_links').update({ status: 'expired' }).eq('session_id', session);
        return res.json({ status: 'expired' });
      }
      return res.json({ status: 'pending' });
    }

    if (s.status === 'approved') {
      const { data: client } = await supabase.from('clients').select('*').eq('id', s.client_id).maybeSingle();
      if (!client) return res.json({ status: 'expired' });

      // Single-use guarantee: remove session immediately upon redemption
      await supabase.from('auth_magic_links').delete().eq('session_id', session);

      const token = await createSession(client.id);
      return res.json({ status: 'success', token });
    }

    res.json({ status: 'pending' });
  } catch (err) {
    res.json({ status: 'pending' });
  }
});

/* ── VK Auth Helper: Resolve registered redirect URI ── */
function getVkRedirectUri(req) {
  if (process.env.VK_REDIRECT_URI) return process.env.VK_REDIRECT_URI;
  return 'https://auto-electrician-landing.vercel.app/api/client/auth/vk/callback';
}

/* ── 4. VK ID One Tap Token Verification & Exchange ── */
app.post('/api/client/auth/vk', limiterVkAuth, async (req, res) => {
  const { access_token, user_id } = req.body;
  if (!access_token) {
    return res.status(400).json({ ok: false, error: 'access_token_required' });
  }

  if (!supabase) {
    return res.status(503).json({
      ok: false,
      error: 'db_unavailable',
      message: 'База данных временно недоступна'
    });
  }

  try {
    let userData = null;

    // 1. First attempt: VK ID OAuth2 user_info endpoint
    try {
      const userInfoUrl = `https://id.vk.com/oauth2/user_info?client_id=${VK_APP_ID}`;
      const postData = new URLSearchParams({ access_token }).toString();
      const vr = await new Promise((resolve, reject) => {
        const r = https.request(userInfoUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, resp => {
          let d = '';
          resp.on('data', chunk => d += chunk);
          resp.on('end', () => {
            try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
          });
        });
        r.on('error', reject);
        r.write(postData);
        r.end();
      });

      if (vr && vr.user) {
        userData = vr.user;
      }
    } catch (e) {
      console.warn('VK ID user_info fetch warning:', e.message);
    }

    // 2. Fallback: traditional api.vk.com users.get
    if (!userData && user_id) {
      try {
        const usersGetUrl = `https://api.vk.com/method/users.get?user_ids=${user_id}&fields=photo_100,contacts&access_token=${access_token}&v=5.199`;
        const ugRes = await new Promise((resolve, reject) => {
          https.get(usersGetUrl, r => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => {
              try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
            });
          }).on('error', reject);
        });
        if (ugRes && ugRes.response && ugRes.response[0]) {
          const u = ugRes.response[0];
          userData = {
            user_id: String(u.id),
            first_name: u.first_name,
            last_name: u.last_name,
            avatar: u.photo_100,
            phone: u.mobile_phone || u.home_phone || ''
          };
        }
      } catch (e) {
        console.warn('VK users.get fallback warning:', e.message);
      }
    }

    if (!userData) {
      return res.status(401).json({ ok: false, error: 'invalid_token', message: 'Не удалось подтвердить токен VK' });
    }

    const vkId = String(userData.user_id || user_id);
    const firstName = userData.first_name || '';
    const lastName = userData.last_name || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || `VK Пользователь ${vkId}`;
    const phone = userData.phone || '';
    const email = userData.email || '';

    // Search client in Supabase by vk_id
    let { data: client, error: findErr } = await supabase
      .from('clients')
      .select('*')
      .eq('vk_id', vkId)
      .maybeSingle();

    if (findErr) {
      console.error('Find VK client error:', findErr);
      return res.status(503).json({ ok: false, error: 'db_error', message: findErr.message });
    }

    // If client not found by vk_id, but phone is present, link vk_id to existing account
    if (!client && phone) {
      const { data: phoneClient } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();
      if (phoneClient) {
        client = phoneClient;
        await supabase.from('clients').update({ vk_id: vkId }).eq('id', client.id);
      }
    }

    // If still not found, create new client
    if (!client) {
      const newClient = {
        id: crypto.randomUUID(),
        name: fullName,
        phone: phone || '',
        email: email || '',
        vk_id: vkId,
        telegram_id: '',
        telegram_username: '',
        telegram_chat_id: '',
        cars: [],
        repairs: [],
        created_at: new Date().toISOString()
      };
      const { error: insErr } = await supabase.from('clients').insert([newClient]);
      if (insErr) {
        return res.status(500).json({ ok: false, error: 'db_error', message: insErr.message });
      }
      client = newClient;
    }

    const token = await createSession(client.id);
    res.json({ ok: true, token, clientId: client.id, name: client.name });
  } catch (err) {
    console.error('VK auth endpoint error:', err);
    res.status(500).json({ ok: false, error: 'internal_error', message: err.message });
  }
});

/* ── Stateless Cryptographic PKCE state helper ── */
function createPkceState(verifier, returnUrl) {
  const payload = {
    v: verifier,
    r: returnUrl || 'https://xn--c1adkgvmp7a.xn--p1ai/profile.html',
    t: Date.now()
  };
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString('base64url');
  const hmac = crypto.createHmac('sha256', VK_APP_SECRET).update(data).digest('base64url');
  return `${data}.${hmac}`;
}

function verifyPkceState(stateStr) {
  if (!stateStr || typeof stateStr !== 'string') return null;
  const parts = stateStr.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', VK_APP_SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const json = Buffer.from(data, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    // Expire after 15 minutes
    if (Date.now() - parsed.t > 15 * 60 * 1000) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

/* ── 5. VK ID Direct Login Redirect (with OAuth 2.1 PKCE) ── */
app.get('/api/client/auth/vk/login', (req, res) => {
  const redirectUri = getVkRedirectUri(req);
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'xn--c1adkgvmp7a.xn--p1ai';
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const returnUrl = `${proto}://${host}/profile.html`;

  const state = createPkceState(verifier, returnUrl);

  const vkAuthUrl = `https://id.vk.ru/authorize?app_id=${VK_APP_ID}&client_id=${VK_APP_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${challenge}&code_challenge_method=s256&state=${encodeURIComponent(state)}&origin=https%3A%2F%2Fxn--c1adkgvmp7a.xn--p1ai&v=2.6.8&sdk_type=vkid`;
  res.redirect(vkAuthUrl);
});

/* ── 6. VK OAuth / VK ID Callback ── */
app.get('/api/client/auth/vk/callback', async (req, res) => {
  const { code, state, device_id, error, error_description } = req.query;
  if (error) {
    console.error('VK OAuth callback error:', error, error_description);
    return res.redirect(`/profile.html?auth=error&reason=${encodeURIComponent(error)}`);
  }
  if (!code) return res.redirect('/profile.html');

  try {
    const redirectUri = getVkRedirectUri(req);
    let accessToken = null;
    let userId = null;
    let email = '';
    let returnUrl = '/profile.html';

    const pkce = verifyPkceState(state);
    if (pkce && pkce.v) {
      returnUrl = pkce.r || '/profile.html';
      // Modern VK ID OAuth 2.1 PKCE code exchange
      try {
        const tokenExchangeUrl = 'https://id.vk.com/oauth2/auth';
        const postData = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: VK_APP_ID,
          code_verifier: pkce.v,
          redirect_uri: redirectUri,
          code,
          state: state || '',
          device_id: device_id || ''
        }).toString();

        const exchangeRes = await new Promise((resolve, reject) => {
          const r = https.request(tokenExchangeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData)
            }
          }, resp => {
            let d = '';
            resp.on('data', c => d += c);
            resp.on('end', () => {
              try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
            });
          });
          r.on('error', reject);
          r.write(postData);
          r.end();
        });

        if (exchangeRes && exchangeRes.access_token) {
          accessToken = exchangeRes.access_token;
          userId = exchangeRes.user_id;
          email = exchangeRes.email || '';
        }
      } catch (err) {
        console.warn('VK ID PKCE code exchange warning:', err.message);
      }
    }

    // Fallback exchange via oauth.vk.com/access_token if PKCE exchange did not return token
    if (!accessToken) {
      const tokenUrl = `https://oauth.vk.com/access_token?client_id=${VK_APP_ID}&client_secret=${VK_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
      const tokenResponse = await new Promise((resolve, reject) => {
        https.get(tokenUrl, r => {
          let d = '';
          r.on('data', chunk => d += chunk);
          r.on('end', () => {
            try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
          });
        }).on('error', reject);
      });

      if (tokenResponse && tokenResponse.access_token) {
        accessToken = tokenResponse.access_token;
        userId = tokenResponse.user_id;
        email = tokenResponse.email || '';
      }
    }

    if (!accessToken) {
      console.error('VK Token Exchange Failed');
      const sep = returnUrl.includes('?') ? '&' : '?';
      return res.redirect(`${returnUrl}${sep}auth=error&reason=vk_token`);
    }

    const vkId = String(userId);
    let name = `VK Пользователь ${vkId}`;
    let phone = '';

    // Fetch user details from VK ID user_info or api.vk.com
    try {
      const userInfoUrl = `https://id.vk.com/oauth2/user_info?client_id=${VK_APP_ID}`;
      const postData = new URLSearchParams({ access_token: accessToken }).toString();
      const uInfo = await new Promise((resolve, reject) => {
        const r = https.request(userInfoUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, resp => {
          let d = '';
          resp.on('data', c => d += c);
          resp.on('end', () => {
            try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
          });
        });
        r.on('error', reject);
        r.write(postData);
        r.end();
      });
      if (uInfo && uInfo.user) {
        const u = uInfo.user;
        name = [u.first_name, u.last_name].filter(Boolean).join(' ') || name;
        phone = u.phone || '';
      }
    } catch (e) {
      console.warn('VK user_info fetch warning in callback:', e.message);
    }

    if (!supabase) {
      const sep = returnUrl.includes('?') ? '&' : '?';
      return res.redirect(`${returnUrl}${sep}auth=error&reason=db`);
    }
    let { data: client } = await supabase.from('clients').select('*').eq('vk_id', vkId).maybeSingle();

    if (!client && phone) {
      const { data: pClient } = await supabase.from('clients').select('*').eq('phone', phone).maybeSingle();
      if (pClient) {
        client = pClient;
        await supabase.from('clients').update({ vk_id: vkId }).eq('id', client.id);
      }
    }

    if (!client) {
      client = {
        id: crypto.randomUUID(),
        name,
        phone: phone || '',
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
    const sep = returnUrl.includes('?') ? '&' : '?';
    res.redirect(`${returnUrl}${sep}auth=vk&token=${token}&name=${encodeURIComponent(client.name)}`);

  } catch (err) {
    console.error('VK Callback Exception:', err);
    res.redirect('/profile.html?auth=error&reason=server_error');
  }
});

async function clientAuth(req, res, next) {
  const token = req.headers['x-client-token'];
  if (!token) return res.status(401).json({ error: 'No token' });
  if (!supabase) return res.status(503).json({ error: 'db_unavailable' });
  
  try {
    const { data: session, error: sessionErr } = await supabase
      .from('auth_sessions').select('*').eq('token', token).maybeSingle();
    
    // DB error (fetch failed, ENOTFOUND, etc.) → return 503 so client doesn't clear token
    if (sessionErr) {
      const isDbDown = sessionErr.message && (
        sessionErr.message.includes('fetch failed') || 
        sessionErr.message.includes('ENOTFOUND') ||
        sessionErr.message.includes('FetchError')
      );
      return res.status(503).json({ error: isDbDown ? 'db_unavailable' : 'db_error' });
    }
    
    if (!session || new Date(session.expires_at).getTime() < Date.now()) {
      if (session) await supabase.from('auth_sessions').delete().eq('token', token);
      return res.status(401).json({ error: 'Session expired' });
    }
    
    req.clientId = session.client_id;
    next();
  } catch (err) {
    // Network / unexpected error → do NOT return 401 to avoid wiping client token
    const isDbDown = err.message && (err.message.includes('fetch failed') || err.message.includes('ENOTFOUND'));
    return res.status(503).json({ error: isDbDown ? 'db_unavailable' : 'internal_error' });
  }
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
