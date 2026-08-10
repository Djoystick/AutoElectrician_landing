/* ============================================================
   server.js — AutoElectro Backend v2.0
   Express 5 · JSON flat-file DB · Multer uploads
   + CRM: clients, requests, repairs
   + Telegram OTP auth for clients
============================================================ */

'use strict';

const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const cors     = require('cors');
const multer   = require('multer');
const crypto   = require('crypto');

/* ── Optional Telegram Bot (loaded only if token is set at runtime) ── */
let TelegramBot = null;
try { TelegramBot = require('node-telegram-bot-api'); } catch {}

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Paths ── */
const DATA_FILE  = path.join(__dirname, 'data', 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

/* ── Ensure directories exist ── */
[path.join(__dirname, 'data'), UPLOAD_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ── In-memory OTP store { phone: { code, expiresAt } } ── */
const otpStore = new Map();

/* ── In-memory session store { token: { clientId, expiresAt } } ── */
const sessionStore = new Map();

/* ── Telegram bot instance (initialised lazily when token is saved) ── */
let tgBot = null;

function getBot() {
  const data  = readData();
  const token = process.env.TELEGRAM_BOT_TOKEN || data.settings?.telegramBotToken;
  if (!token || !TelegramBot) return null;
  if (!tgBot) {
    tgBot = new TelegramBot(token, { polling: true });
    setupBotHandlers(tgBot);
  }
  return tgBot;
}

function setupBotHandlers(bot) {
  /* /start — register chat ID by phone number */
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
      '👋 Привет! Я бот для входа в личный кабинет клиента AutoElectro.\n\n' +
      'Отправьте ваш номер телефона в формате +79991234567, чтобы привязать аккаунт.'
    );
  });

  /* Any text message that looks like a phone — register chatId */
  bot.on('message', (msg) => {
    const text = (msg.text || '').trim().replace(/[\s\-()]/g, '');
    if (/^\+7\d{10}$/.test(text) || /^8\d{10}$/.test(text)) {
      // Normalise to +7 format
      const phone = text.startsWith('8') ? '+7' + text.slice(1) : text;
      const data  = readData();
      const client = (data.clients || []).find(c => c.phone === phone);
      if (client) {
        // Save chatId to client record
        client.telegramChatId = msg.chat.id;
        writeData(data);
        bot.sendMessage(msg.chat.id,
          `✅ Телефон ${phone} привязан! Теперь коды для входа будут приходить сюда автоматически.`
        );
      } else {
        bot.sendMessage(msg.chat.id,
          `⚠️ Номер ${phone} не найден в базе. Сначала обратитесь к мастеру — он создаст ваш профиль.`
        );
      }
    }
  });
}

/* ── Init bot on startup if token is already saved ── */
try { getBot(); } catch {}

/* ── Multer storage ── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

/* ── Middleware ── */
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

/* ── Data helpers ── */
const readData  = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = data => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

/* ── ID generator ── */
const uid = () => crypto.randomBytes(8).toString('hex');

/* ── Admin auth middleware ── */
const authCheck = (req, res, next) => {
  const pwd  = req.headers['x-admin-password'] || req.body?.password;
  const data = readData();
  if (pwd && pwd === data.settings?.password) return next();
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

/* ── Compute client retention status ── */
function retentionStatus(client) {
  const repairs = client.repairs || [];
  if (!repairs.length) return 'none';
  const last  = new Date(repairs[repairs.length - 1].date).getTime();
  const diff  = (Date.now() - last) / (1000 * 60 * 60 * 24 * 30); // months
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
   ░░ EXISTING PUBLIC ROUTES (unchanged) ░░
══════════════════════════════════════════════════════════ */

/* GET all public data (password excluded) */
app.get('/api/data', (req, res) => {
  const data = readData();
  const { password, telegramBotToken, ...safeSettings } = data.settings || {};
  // Only return active services to public
  const activeServices = (data.services || []).filter(s => s.active !== false);
  res.json({ ...data, settings: safeSettings, services: activeServices });
});

/* ══════════════════════════════════════════════════════════
   ░░ ADMIN AUTH (unchanged) ░░
══════════════════════════════════════════════════════════ */

app.post('/api/auth', (req, res) => {
  const data = readData();
  if (req.body.password === data.settings?.password) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: 'Неверный пароль' });
  }
});

/* ══════════════════════════════════════════════════════════
   ░░ SETTINGS (unchanged + new fields) ░░
══════════════════════════════════════════════════════════ */

app.put('/api/settings', authCheck, (req, res) => {
  const data = readData();
  const { password: newPwd, telegramBotToken: newToken, ...rest } = req.body;
  data.settings = { ...data.settings, ...rest };
  if (newPwd)   data.settings.password = newPwd;
  if (newToken !== undefined) {
    data.settings.telegramBotToken = newToken;
    // Reset bot instance so it re-initialises with new token
    if (tgBot) { try { tgBot.stopPolling(); } catch {} tgBot = null; }
    if (newToken) setTimeout(() => { try { getBot(); } catch {} }, 500);
  }
  writeData(data);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   ░░ CONTACTS (unchanged) ░░
══════════════════════════════════════════════════════════ */

app.put('/api/contacts', authCheck, (req, res) => {
  const data = readData();
  data.contacts = { ...data.contacts, ...req.body };
  writeData(data);
  res.json({ ok: true, contacts: data.contacts });
});

/* ══════════════════════════════════════════════════════════
   ░░ SERVICES (unchanged, now with active flag) ░░
══════════════════════════════════════════════════════════ */

app.post('/api/services', authCheck, (req, res) => {
  const data    = readData();
  const service = req.body;
  if (service.active === undefined) service.active = true;

  if (service.id) {
    const idx = data.services.findIndex(s => s.id === service.id);
    if (idx !== -1) data.services[idx] = service;
    else            data.services.push(service);
  } else {
    service.id = Date.now().toString();
    data.services.push(service);
  }
  writeData(data);
  res.json({ ok: true, services: data.services });
});

/* Reorder services (drag-drop) */
app.put('/api/services/reorder', authCheck, (req, res) => {
  const { ids } = req.body; // array of ids in new order
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids required' });
  const data = readData();
  const map  = Object.fromEntries(data.services.map(s => [s.id, s]));
  data.services = ids.map(id => map[id]).filter(Boolean);
  writeData(data);
  res.json({ ok: true, services: data.services });
});

app.delete('/api/services/:id', authCheck, (req, res) => {
  const data = readData();
  data.services = data.services.filter(s => s.id !== req.params.id);
  writeData(data);
  res.json({ ok: true, services: data.services });
});

/* ══════════════════════════════════════════════════════════
   ░░ REVIEWS (now with edit support) ░░
══════════════════════════════════════════════════════════ */

app.post('/api/reviews', authCheck, upload.single('image'), (req, res) => {
  const data   = readData();
  const review = {
    id:    Date.now().toString(),
    name:  req.body.name || 'Аноним',
    text:  req.body.text || '',
    image: req.file ? `/uploads/${req.file.filename}` : (req.body.imageUrl || ''),
  };
  data.reviews.push(review);
  writeData(data);
  res.json({ ok: true, review });
});

app.put('/api/reviews/:id', authCheck, (req, res) => {
  const data = readData();
  const idx  = data.reviews.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.reviews[idx] = { ...data.reviews[idx], ...req.body };
  writeData(data);
  res.json({ ok: true, review: data.reviews[idx] });
});

app.delete('/api/reviews/:id', authCheck, (req, res) => {
  const data   = readData();
  const review = data.reviews.find(r => r.id === req.params.id);
  if (review?.image?.startsWith('/uploads/')) {
    const fp = path.join(PUBLIC_DIR, review.image);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  data.reviews = data.reviews.filter(r => r.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

/* Reorder reviews */
app.put('/api/reviews/reorder', authCheck, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids required' });
  const data = readData();
  const map  = Object.fromEntries(data.reviews.map(r => [r.id, r]));
  data.reviews = ids.map(id => map[id]).filter(Boolean);
  writeData(data);
  res.json({ ok: true, reviews: data.reviews });
});

/* ══════════════════════════════════════════════════════════
   ░░ NEW: REQUESTS (заявки с сайта) ░░
══════════════════════════════════════════════════════════ */

/* Public: submit request from landing */
app.post('/api/requests', (req, res) => {
  const { name, phone, problem } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const data    = readData();
  if (!data.requests) data.requests = [];
  const request = {
    id:        uid(),
    name:      name  || 'Без имени',
    phone:     phone || '',
    problem:   problem || '',
    createdAt: new Date().toISOString(),
    status:    'new',
    clientId:  null,
  };
  data.requests.push(request);
  writeData(data);

  // Notify master via Telegram if bot is configured
  try {
    const bot        = getBot();
    const masterChatId = data.settings?.masterTelegramChatId;
    if (bot && masterChatId) {
      bot.sendMessage(masterChatId,
        `📥 <b>Новая заявка!</b>\n👤 ${request.name}\n📞 ${request.phone}\n🔧 ${request.problem || '—'}`,
        { parse_mode: 'HTML' }
      );
    }
  } catch {}

  res.json({ ok: true, id: request.id });
});

/* Admin: list all requests */
app.get('/api/requests', authCheck, (req, res) => {
  const data = readData();
  res.json({ ok: true, requests: (data.requests || []).reverse() });
});

/* Admin: update request status */
app.put('/api/requests/:id/status', authCheck, (req, res) => {
  const { status } = req.body;
  const data = readData();
  const req_ = (data.requests || []).find(r => r.id === req.params.id);
  if (!req_) return res.status(404).json({ error: 'Not found' });
  req_.status = status;
  writeData(data);
  res.json({ ok: true, request: req_ });
});

/* Admin: delete request */
app.delete('/api/requests/:id', authCheck, (req, res) => {
  const data = readData();
  data.requests = (data.requests || []).filter(r => r.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   ░░ NEW: CLIENT AUTH (Telegram OTP) ░░
══════════════════════════════════════════════════════════ */

/* Step 1 — request OTP code */
app.post('/api/client/auth/request', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const data   = readData();
  const client = (data.clients || []).find(c => c.phone === phone);
  if (!client) return res.status(404).json({ ok: false, error: 'client_not_found' });

  // Generate 6-digit OTP, valid 10 minutes
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(phone, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  // Try sending via Telegram bot
  const bot        = getBot();
  const chatId     = client.telegramChatId;
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

  // In dev / no-telegram mode return code directly so master can share manually
  res.json({
    ok:           true,
    deliveryMode,                          // 'telegram' | 'manual'
    // Only include code if bot NOT configured (manual fallback)
    ...(deliveryMode === 'manual' && { code }),
    telegramLinked: !!(chatId),
    clientName:   client.name,
  });
});

/* Step 2 — verify OTP, get session token */
app.post('/api/client/auth', (req, res) => {
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

  const data   = readData();
  const client = (data.clients || []).find(c => c.phone === phone);
  if (!client) return res.status(404).json({ ok: false, error: 'client_not_found' });

  // Create session token, valid 30 days
  const token = crypto.randomBytes(32).toString('hex');
  sessionStore.set(token, {
    clientId:  client.id,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  res.json({ ok: true, token, clientId: client.id, name: client.name });
});

/* Get own profile (client) */
app.get('/api/client/me', clientAuth, (req, res) => {
  const data   = readData();
  const client = (data.clients || []).find(c => c.id === req.clientId);
  if (!client) return res.status(404).json({ error: 'Not found' });

  // Don't expose accessCode or telegramChatId to client
  const { accessCode, telegramChatId, ...safeClient } = client;
  const repairCount = (client.repairs || []).length;
  safeClient.level  = loyaltyLevel(repairCount);

  // Include master info
  const { password, telegramBotToken, masterTelegramChatId, ...safeSettings } = data.settings || {};
  res.json({ ok: true, client: safeClient, masterInfo: { ...safeSettings, contacts: data.contacts } });
});

/* Client marks reminder as done */
app.put('/api/client/reminder/:rid', clientAuth, (req, res) => {
  const data   = readData();
  const client = (data.clients || []).find(c => c.id === req.clientId);
  if (!client) return res.status(404).json({ error: 'Not found' });

  let found = false;
  (client.repairs || []).forEach(repair => {
    if (repair.reminder && repair.id === req.params.rid) {
      repair.reminder.done = true;
      found = true;
    }
  });
  if (!found) return res.status(404).json({ error: 'Reminder not found' });
  writeData(data);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   ░░ NEW: CLIENTS CRM (admin) ░░
══════════════════════════════════════════════════════════ */

/* GET all clients with summary stats */
app.get('/api/clients', authCheck, (req, res) => {
  const data = readData();
  const clients = (data.clients || []).map(c => {
    const repairCount = (c.repairs || []).length;
    const lastRepair  = repairCount
      ? c.repairs[repairCount - 1].date
      : null;
    return {
      id:             c.id,
      name:           c.name,
      phone:          c.phone,
      level:          loyaltyLevel(repairCount),
      repairCount,
      lastRepairDate: lastRepair,
      retention:      retentionStatus(c),
      cars:           c.cars || [],
      telegramLinked: !!(c.telegramChatId),
    };
  });
  res.json({ ok: true, clients });
});

/* POST create client */
app.post('/api/clients', authCheck, (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
  const data = readData();
  if (!data.clients) data.clients = [];

  if (data.clients.find(c => c.phone === phone)) {
    return res.status(409).json({ error: 'client_exists' });
  }

  // Generate a 4-digit access code for legacy manual fallback
  const accessCode = String(Math.floor(1000 + Math.random() * 9000));
  const client = {
    id:        uid(),
    name,
    phone,
    accessCode, // shown to master, can be shared manually
    cars:       [],
    repairs:    [],
    createdAt:  new Date().toISOString(),
  };
  data.clients.push(client);
  writeData(data);
  res.json({ ok: true, client });
});

/* GET single client detail */
app.get('/api/clients/:id', authCheck, (req, res) => {
  const data   = readData();
  const client = (data.clients || []).find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const repairCount = (client.repairs || []).length;
  res.json({ ok: true, client: { ...client, level: loyaltyLevel(repairCount), retention: retentionStatus(client) } });
});

/* PUT update client base info */
app.put('/api/clients/:id', authCheck, (req, res) => {
  const data = readData();
  const idx  = (data.clients || []).findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { repairs, cars, id, ...editable } = req.body; // can't overwrite cars/repairs via this route
  data.clients[idx] = { ...data.clients[idx], ...editable };
  writeData(data);
  res.json({ ok: true, client: data.clients[idx] });
});

/* DELETE client */
app.delete('/api/clients/:id', authCheck, (req, res) => {
  const data = readData();
  data.clients = (data.clients || []).filter(c => c.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

/* ── Cars ── */
app.post('/api/clients/:id/cars', authCheck, (req, res) => {
  const data   = readData();
  const client = (data.clients || []).find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });

  const car = { id: uid(), status: 'ok', ...req.body };
  if (!client.cars) client.cars = [];

  if (car.id && client.cars.find(c => c.id === car.id)) {
    // Update existing
    const idx = client.cars.findIndex(c => c.id === car.id);
    client.cars[idx] = car;
  } else {
    car.id = uid();
    client.cars.push(car);
  }
  writeData(data);
  res.json({ ok: true, cars: client.cars });
});

app.delete('/api/clients/:id/cars/:cid', authCheck, (req, res) => {
  const data   = readData();
  const client = (data.clients || []).find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  client.cars = (client.cars || []).filter(c => c.id !== req.params.cid);
  writeData(data);
  res.json({ ok: true, cars: client.cars });
});

/* ── Repairs ── */
app.post('/api/clients/:id/repairs', authCheck, upload.array('photos', 5), (req, res) => {
  const data   = readData();
  const client = (data.clients || []).find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });

  const photos = (req.files || []).map(f => `/uploads/${f.filename}`);

  let reminder = null;
  if (req.body.reminderDate && req.body.reminderText) {
    reminder = {
      date: req.body.reminderDate,
      text: req.body.reminderText,
      done: false,
    };
  }

  const repair = {
    id:          uid(),
    carId:       req.body.carId       || null,
    date:        req.body.date        || new Date().toISOString().slice(0, 10),
    type:        req.body.type        || 'Другое',
    description: req.body.description || '',
    cost:        parseFloat(req.body.cost) || 0,
    photos,
    reminder,
    createdAt:   new Date().toISOString(),
  };

  if (!client.repairs) client.repairs = [];
  client.repairs.push(repair);

  // Update client level
  client.level = loyaltyLevel(client.repairs.length);

  writeData(data);
  res.json({ ok: true, repair, repairs: client.repairs });
});

app.delete('/api/clients/:id/repairs/:rid', authCheck, (req, res) => {
  const data   = readData();
  const client = (data.clients || []).find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });

  const repair = (client.repairs || []).find(r => r.id === req.params.rid);
  // Remove photos from disk
  (repair?.photos || []).forEach(p => {
    if (p.startsWith('/uploads/')) {
      const fp = path.join(PUBLIC_DIR, p);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  });

  client.repairs = (client.repairs || []).filter(r => r.id !== req.params.rid);
  writeData(data);
  res.json({ ok: true });
});

/* ── Client: mark reminder done (by client token) ── */
app.put('/api/client/reminder/:repairId', clientAuth, (req, res) => {
  const { clientId } = req.session;
  const data   = readData();
  const client = (data.clients || []).find(c => c.id === clientId);
  if (!client) return res.status(404).json({ error: 'Not found' });

  const repair = (client.repairs || []).find(r => r.id === req.params.repairId);
  if (!repair) return res.status(404).json({ error: 'Repair not found' });

  if (repair.reminder) repair.reminder.done = true;
  writeData(data);
  res.json({ ok: true });
});

/* ── Reminders (add standalone) ── */
app.post('/api/clients/:id/reminders', authCheck, (req, res) => {
  const data   = readData();
  const client = (data.clients || []).find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });

  // Attach reminder to a synthetic repair entry
  const reminder = {
    id:          uid(),
    carId:       req.body.carId || null,
    date:        new Date().toISOString().slice(0, 10),
    type:        'Напоминание',
    description: req.body.text || '',
    cost:        0,
    photos:      [],
    reminder:    { date: req.body.date, text: req.body.text, done: false },
    createdAt:   new Date().toISOString(),
  };
  if (!client.repairs) client.repairs = [];
  client.repairs.push(reminder);
  writeData(data);
  res.json({ ok: true, reminder });
});

/* ══════════════════════════════════════════════════════════
   ░░ ADMIN: ANALYTICS ░░
══════════════════════════════════════════════════════════ */

app.get('/api/analytics', authCheck, (req, res) => {
  const data     = readData();
  const clients  = data.clients  || [];
  const requests = data.requests || [];

  const now      = new Date();
  const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);

  // Visits per month (last 6 months)
  const visitsByMonth = {};
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    visitsByMonth[key] = 0;
  }
  clients.forEach(c => {
    (c.repairs || []).forEach(r => {
      const key = r.date ? r.date.slice(0, 7) : null;
      if (key && visitsByMonth.hasOwnProperty(key)) visitsByMonth[key]++;
    });
  });

  // Service type frequency
  const serviceFreq = {};
  clients.forEach(c => {
    (c.repairs || []).forEach(r => {
      serviceFreq[r.type] = (serviceFreq[r.type] || 0) + 1;
    });
  });

  // Revenue this month
  let monthRevenue = 0, monthVisits = 0;
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  clients.forEach(c => {
    (c.repairs || []).forEach(r => {
      if ((r.date || '').startsWith(monthStr)) {
        monthRevenue += r.cost || 0;
        monthVisits++;
      }
    });
  });

  // Churn risk (6+ months)
  const churnClients = clients.filter(c => retentionStatus(c) === 'red').map(c => ({
    id: c.id, name: c.name, phone: c.phone,
    lastRepairDate: c.repairs?.slice(-1)[0]?.date || null,
  }));

  res.json({
    ok: true,
    totalClients:    clients.length,
    newRequests:     requests.filter(r => r.status === 'new').length,
    monthVisits,
    monthRevenue,
    avgCheck:        monthVisits ? Math.round(monthRevenue / monthVisits) : 0,
    churnCount:      churnClients.length,
    churnClients,
    visitsByMonth,
    serviceFreq,
  });
});

/* ── Start ── */
app.listen(PORT, () => {
  console.log(`✅  Сервер запущен → http://localhost:${PORT}`);
  console.log(`⚙️   Админка        → http://localhost:${PORT}/admin.html`);
  console.log(`👤  Профиль        → http://localhost:${PORT}/profile.html`);
});
