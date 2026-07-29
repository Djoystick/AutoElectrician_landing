/* ============================================================
   server.js — AutoElectro Backend
   Express 5 · JSON flat-file DB · Multer uploads
============================================================ */

'use strict';

const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const cors     = require('cors');
const multer   = require('multer');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Paths ── */
const DATA_FILE   = path.join(__dirname, 'data', 'data.json');
const UPLOAD_DIR  = path.join(__dirname, 'public', 'uploads');
const PUBLIC_DIR  = path.join(__dirname, 'public');

/* ── Ensure directories exist ── */
[path.join(__dirname, 'data'), UPLOAD_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
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

/* ── Auth middleware ── */
const authCheck = (req, res, next) => {
  const pwd  = req.headers['x-admin-password'] || req.body?.password;
  const data = readData();
  if (pwd && pwd === data.settings?.password) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

/* ══════════════════════════════════════════════════════════
   PUBLIC ROUTES
══════════════════════════════════════════════════════════ */

/* GET all data (password excluded) */
app.get('/api/data', (req, res) => {
  const data = readData();
  const { password, ...safeSettings } = data.settings || {};
  res.json({ ...data, settings: safeSettings });
});

/* ══════════════════════════════════════════════════════════
   AUTH
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
   SETTINGS
══════════════════════════════════════════════════════════ */

app.put('/api/settings', authCheck, (req, res) => {
  const data = readData();
  const { password: newPwd, ...rest } = req.body;
  data.settings = { ...data.settings, ...rest };
  if (newPwd) data.settings.password = newPwd;
  writeData(data);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   CONTACTS
══════════════════════════════════════════════════════════ */

app.put('/api/contacts', authCheck, (req, res) => {
  const data = readData();
  data.contacts = { ...data.contacts, ...req.body };
  writeData(data);
  res.json({ ok: true, contacts: data.contacts });
});

/* ══════════════════════════════════════════════════════════
   SERVICES
══════════════════════════════════════════════════════════ */

/* Create or update */
app.post('/api/services', authCheck, (req, res) => {
  const data    = readData();
  const service = req.body;

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

/* Delete */
app.delete('/api/services/:id', authCheck, (req, res) => {
  const data = readData();
  data.services = data.services.filter(s => s.id !== req.params.id);
  writeData(data);
  res.json({ ok: true, services: data.services });
});

/* ══════════════════════════════════════════════════════════
   REVIEWS
══════════════════════════════════════════════════════════ */

/* Create (with image upload) */
app.post('/api/reviews', authCheck, upload.single('image'), (req, res) => {
  const data   = readData();
  const review = {
    id:    Date.now().toString(),
    name:  req.body.name  || 'Аноним',
    text:  req.body.text  || '',
    image: req.file ? `/uploads/${req.file.filename}` : '',
  };
  data.reviews.push(review);
  writeData(data);
  res.json({ ok: true, review });
});

/* Delete */
app.delete('/api/reviews/:id', authCheck, (req, res) => {
  const data   = readData();
  const review = data.reviews.find(r => r.id === req.params.id);

  /* Remove uploaded file from disk */
  if (review?.image?.startsWith('/uploads/')) {
    const fp = path.join(PUBLIC_DIR, review.image);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  data.reviews = data.reviews.filter(r => r.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

/* ── Start ── */
app.listen(PORT, () => {
  console.log(`✅  Сервер запущен → http://localhost:${PORT}`);
  console.log(`⚙️   Админка        → http://localhost:${PORT}/admin.html`);
});
