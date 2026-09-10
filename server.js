/* ============================================================
   server.js — AutoElectro Runner (Unified Express Backend)
   Loads environment and launches app from api/index.js
============================================================ */
'use strict';

require('dotenv').config();
const app = require('./api/index');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅  Сервер запущен → http://localhost:${PORT}`);
  console.log(`⚙️   Админка        → http://localhost:${PORT}/admin.html`);
  console.log(`👤  Профиль        → http://localhost:${PORT}/profile.html`);
});
