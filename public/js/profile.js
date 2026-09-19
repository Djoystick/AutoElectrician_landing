/* ============================================================
   profile.js — Личный кабинет клиента AutoElectro v1.1
   Авторизация: Telegram Widget | VK OAuth | Телефон + OTP
============================================================ */
'use strict';

// Canonical domain normalization: automatically redirect technical Vercel domain to чекгорит.рф
if (window.location.hostname === 'auto-electrician-landing.vercel.app') {
  window.location.replace('https://xn--c1adkgvmp7a.xn--p1ai' + window.location.pathname + window.location.search + window.location.hash);
}

window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('[Client Error]', msg, url, lineNo, columnNo, error);
};
window.addEventListener("unhandledrejection", function(event) {
  console.error('[Unhandled Rejection]', event.reason);
});

const TOKEN_KEY = 'ae_client_token';
let CLIENT = null;
let MASTER  = null;
let TOKEN   = localStorage.getItem(TOKEN_KEY) || '';

const MASCOT_TIPS = [
  '⚡ Совет: Проверяйте аккумулятор перед зимой — слабый АКБ не запустит двигатель в мороз.',
  '🔧 Раз в год делайте диагностику — мелкие проблемы лучше находить до поломки в дороге.',
  '🚗 Обратите внимание на напоминания — мастер добавляет их по результатам ремонта.',
  '📋 Все ваши ремонты здесь. Нужна копия — покажите страницу при гарантийном обращении.',
  '⚙️ Если загорелась лампа Check Engine — не игнорируйте. Запишитесь на диагностику!',
];

/* ══════════════════════════════════════════════════════════
   PHONE UPDATE FLOW
══════════════════════════════════════════════════════════ */
const phoneMissingBanner = document.getElementById('phone-missing-banner');
const missingPhoneInput  = document.getElementById('missing-phone-input');
const missingPhoneError  = document.getElementById('missing-phone-error');
const btnSavePhone       = document.getElementById('btn-save-phone');

missingPhoneInput?.addEventListener('input', () => {
  let v = missingPhoneInput.value.replace(/\D/g, '');
  if (v.startsWith('8')) v = '7' + v.slice(1);
  if (v.length > 0 && !v.startsWith('7')) v = '7' + v;
  if (v.length > 11) v = v.slice(0, 11);
  let formatted = '';
  if (v.length >= 1) formatted = '+' + v[0];
  if (v.length >= 2) formatted += ' (' + v.slice(1, 4);
  if (v.length >= 5) formatted += ') ' + v.slice(4, 7);
  if (v.length >= 8) formatted += '-' + v.slice(7, 9);
  if (v.length >= 10) formatted += '-' + v.slice(9, 11);
  missingPhoneInput.value = formatted;
});

btnSavePhone?.addEventListener('click', async () => {
  const raw = missingPhoneInput.value.replace(/[\s\-()]/g, '');
  missingPhoneError.classList.add('hidden');

  if (!/^\+7\d{10}$/.test(raw) && !/^7\d{10}$/.test(raw)) {
    missingPhoneError.textContent = 'Введите корректный номер телефона';
    missingPhoneError.classList.remove('hidden');
    return;
  }

  btnSavePhone.disabled = true;
  btnSavePhone.textContent = 'Сохраняем...';

  try {
    const res = await fetch('/api/client/profile/phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client-token': TOKEN },
      body: JSON.stringify({ phone: raw }),
    });
    const json = await res.json();
    if (json.ok) {
      phoneMissingBanner.classList.add('hidden');
      if (json.token) {
        TOKEN = json.token;
        localStorage.setItem(TOKEN_KEY, TOKEN);
      }
      if (json.merged) {
        await loadProfile();
      }
    } else {
      missingPhoneError.textContent = json.message || json.error || 'Ошибка сохранения';
      missingPhoneError.classList.remove('hidden');
    }
  } catch (err) {
    missingPhoneError.textContent = 'Ошибка сети';
    missingPhoneError.classList.remove('hidden');
  }
  btnSavePhone.disabled = false;
  btnSavePhone.textContent = 'Сохранить';
});

/* ══════════════════════════════════════════════════════════
   LOAD PROFILE
══════════════════════════════════════════════════════════ */
async function loadProfile() {
  try {
    const res = await fetch('/api/client/me', {
      headers: { 'x-client-token': TOKEN },
    });

    // 503 = DB temporarily unavailable (Supabase paused/network) → do NOT clear token
    if (res.status === 503) {
      console.warn('Profile load: DB unavailable (503), keeping session token');
      // Optionally show a non-destructive error state
      return;
    }

    if (res.status === 401) {
      // Only clear token on genuine session expiry (401)
      localStorage.removeItem(TOKEN_KEY);
      TOKEN = '';
      showLoginScreen();
      return;
    }

    const json = await res.json();
    
    if (json.adminToken) {
      localStorage.setItem('ae_admin_token', json.adminToken);
      const adminBtn = document.getElementById('btn-admin-panel');
      if (adminBtn) {
        adminBtn.classList.remove('hidden');
        adminBtn.addEventListener('click', () => { window.location.href = '/admin.html'; });
      }
    }
    
    CLIENT = json.client;
    MASTER = json.masterInfo;
    showProfileScreen();
  } catch {
    showLoginScreen();
  }
}

/* ══════════════════════════════════════════════════════════
   RENDER PROFILE
══════════════════════════════════════════════════════════ */
function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('profile-screen').classList.add('hidden');
  if (window.lucide) lucide.createIcons();
  
  setupTelegramAuthButton();
  setupDemoClientButton();
  initVkIdAuth();
}

function showProfileScreen() {
  // Show phone missing banner if client has no phone
  const phoneMissingBanner = document.getElementById('phone-missing-banner');
  if (phoneMissingBanner) {
    if (!CLIENT.phone || CLIENT.phone.trim() === '') {
      phoneMissingBanner.classList.remove('hidden');
    } else {
      phoneMissingBanner.classList.add('hidden');
    }
  }

  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('profile-screen').classList.remove('hidden');

  initDevDashboard();

  renderGreeting();
  renderStats();
  renderReminders();
  renderCars();
  renderRepairs();
  renderMaster();
  renderMascotTip();

  lucide.createIcons();
}

/* ══════════════════════════════════════════════════════════
   DEVELOPER & LEAD CONTROL CENTER (EXCLUSIVE TO SID VICIOUS)
══════════════════════════════════════════════════════════ */
let devVitalsTimer = null;
let devClockTimer = null;
let currentDevView = 'dev'; // 'dev' | 'client'
let isDevEventsBound = false;

function isDevUser() {
  if (!CLIENT) return false;
  if (CLIENT.id === '19e4e551-4454-4710-8a6d-a4effc211201') return true;
  if (CLIENT.role === 'lead' || CLIENT.role === 'admin') return true;
  if (localStorage.getItem('ae_admin_token')) return true;
  return false;
}

function getDevAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers['x-client-token'] = TOKEN;
  const adminToken = localStorage.getItem('ae_admin_token');
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  return headers;
}

function initDevDashboard() {
  const toggleContainer = document.getElementById('dev-mode-toggle');
  const btnDev = document.getElementById('btn-toggle-dev');
  const btnClient = document.getElementById('btn-toggle-client');
  const devSection = document.getElementById('dev-dashboard-section');
  const clientSection = document.getElementById('client-dashboard-section');

  if (!isDevUser()) {
    if (toggleContainer) toggleContainer.classList.add('hidden');
    if (devSection) devSection.classList.add('hidden');
    if (clientSection) clientSection.classList.remove('hidden');
    if (devVitalsTimer) { clearInterval(devVitalsTimer); devVitalsTimer = null; }
    if (devClockTimer) { clearInterval(devClockTimer); devClockTimer = null; }
    return;
  }

  // Sid Vicious / Lead Master detected: reveal mode switch
  if (toggleContainer) toggleContainer.classList.remove('hidden');

  // Load saved preference or default to 'dev'
  const savedView = sessionStorage.getItem('ae_dev_view_mode') || 'dev';
  setDevViewMode(savedView);

  // Bind events once
  if (!isDevEventsBound) {
    isDevEventsBound = true;

    btnDev?.addEventListener('click', () => {
      setDevViewMode('dev');
      refreshDevDashboard();
    });

    btnClient?.addEventListener('click', () => {
      setDevViewMode('client');
    });

    document.getElementById('dev-btn-crm')?.addEventListener('click', () => {
      window.location.href = '/admin.html';
    });

    document.getElementById('dev-btn-refresh')?.addEventListener('click', () => {
      refreshDevDashboard();
    });

    document.getElementById('dev-action-diag')?.addEventListener('click', runDevDiagnostics);
    document.getElementById('dev-action-push')?.addEventListener('click', sendDevTestPush);
    document.getElementById('dev-action-cache')?.addEventListener('click', clearDevCache);
  }

  // Start live clock
  if (!devClockTimer) {
    updateDevClock();
    devClockTimer = setInterval(updateDevClock, 1000);
  }

  // Initial vitals fetch
  refreshDevDashboard();

  // 15-second polling loop
  if (!devVitalsTimer) {
    devVitalsTimer = setInterval(() => {
      if (currentDevView === 'dev' && !document.hidden) {
        refreshDevDashboard(true);
      }
    }, 15000);
  }
}

function setDevViewMode(mode) {
  currentDevView = mode;
  sessionStorage.setItem('ae_dev_view_mode', mode);

  const btnDev = document.getElementById('btn-toggle-dev');
  const btnClient = document.getElementById('btn-toggle-client');
  const devSection = document.getElementById('dev-dashboard-section');
  const clientSection = document.getElementById('client-dashboard-section');

  if (mode === 'dev') {
    devSection?.classList.remove('hidden');
    clientSection?.classList.add('hidden');

    btnDev?.classList.add('bg-cyan-500', 'text-black', 'font-bold');
    btnDev?.classList.remove('text-gray-400');
    btnClient?.classList.remove('bg-cyan-500', 'text-black', 'font-bold');
    btnClient?.classList.add('text-gray-400');
  } else {
    devSection?.classList.add('hidden');
    clientSection?.classList.remove('hidden');

    btnClient?.classList.add('bg-cyan-500', 'text-black', 'font-bold');
    btnClient?.classList.remove('text-gray-400');
    btnDev?.classList.remove('bg-cyan-500', 'text-black', 'font-bold');
    btnDev?.classList.add('text-gray-400');
  }
  if (window.lucide) lucide.createIcons();
}

function updateDevClock() {
  const clockEl = document.getElementById('dev-server-clock');
  if (!clockEl) return;
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false }) + ' MSK';
}

function formatUptime(sec) {
  if (!sec || sec < 0) return '0с';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}д ${h}ч ${m}м`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м ${s}с`;
}

async function refreshDevDashboard(isSilent = false) {
  const icon = document.getElementById('dev-refresh-icon');
  if (!isSilent && icon) icon.classList.add('animate-spin');

  const t0 = performance.now();

  try {
    const res = await fetch('/api/dev/vitals', {
      headers: getDevAuthHeaders()
    });
    const roundTrip = Math.round(performance.now() - t0);

    const ttfbEl = document.getElementById('vital-ttfb-val');
    if (ttfbEl) {
      const perfTtfb = window.__AE_PERF_TTFB;
      ttfbEl.textContent = (perfTtfb ? Math.round(perfTtfb) : roundTrip) + ' ms';
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || 'Ошибка загрузки телеметрии');
    }

    const json = await res.json();
    const v = json.vitals;

    // Version auto-sync from server/package.json
    if (v.version) {
      const verEl = document.getElementById('dev-app-version');
      if (verEl) verEl.textContent = `v${v.version}`;
    }

    // Supabase DB
    const dbValEl = document.getElementById('vital-db-val');
    const dbStatusEl = document.getElementById('vital-db-status');
    if (dbValEl) dbValEl.textContent = `${v.db.latencyMs} ms`;
    if (dbStatusEl) {
      dbStatusEl.textContent = v.db.status === 'ok' ? 'RLS Active • Connected' : v.db.status;
      dbStatusEl.className = `text-[10px] mt-1 truncate ${v.db.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`;
    }

    // Telegram Bot
    const botValEl = document.getElementById('vital-bot-val');
    const botStatusEl = document.getElementById('vital-bot-status');
    if (botValEl) botValEl.textContent = `${v.bot.pingMs} ms`;
    if (botStatusEl) {
      botStatusEl.textContent = `@${v.bot.username || 'Autoelectrical_Official_bot'}`;
      botStatusEl.className = `text-[10px] mt-1 truncate ${v.bot.status === 'online' ? 'text-cyan-400' : 'text-red-400'}`;
    }

    // Node Memory & Uptime
    const memValEl = document.getElementById('vital-mem-val');
    const uptimeEl = document.getElementById('vital-uptime');
    if (memValEl) memValEl.textContent = `${v.memory.heapUsedMb} MB`;
    if (uptimeEl) uptimeEl.textContent = `Аптайм: ${formatUptime(v.uptimeSec)}`;

    // Entity Counts
    const cEl = document.getElementById('stat-count-clients');
    const rEl = document.getElementById('stat-count-requests');
    const mEl = document.getElementById('stat-count-masters');
    const carEl = document.getElementById('stat-count-cars');
    const repEl = document.getElementById('stat-count-repairs');
    if (cEl) cEl.textContent = v.db.counts.clients ?? '—';
    if (rEl) rEl.textContent = v.db.counts.requests ?? '—';
    if (mEl) mEl.textContent = v.db.counts.masters ?? '—';
    if (carEl) carEl.textContent = v.db.counts.cars ?? '—';
    if (repEl) repEl.textContent = v.db.counts.repairs ?? '—';

    // Logs
    const consoleEl = document.getElementById('dev-log-console');
    if (consoleEl && v.logs && v.logs.length > 0) {
      consoleEl.innerHTML = v.logs.map(log => {
        const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('ru-RU') : '--:--:--';
        const lvlColor = log.level === 'warn' ? 'text-yellow-400' : (log.level === 'error' ? 'text-red-400' : 'text-cyan-400');
        return `<div><span class="text-gray-500">[${timeStr}]</span> <span class="${lvlColor}">[${esc(log.level || 'info').toUpperCase()}]</span> <span>${esc(log.message || log.text || '')}</span></div>`;
      }).join('');
    }

  } catch (err) {
    console.warn('Dev vitals refresh error:', err);
  } finally {
    if (icon) {
      setTimeout(() => icon.classList.remove('animate-spin'), 300);
    }
  }
}

async function runDevDiagnostics() {
  const diagBox = document.getElementById('dev-diag-box');
  const badgeEl = document.getElementById('dev-diag-badge');
  const itemsEl = document.getElementById('dev-diag-items');
  const btnDiag = document.getElementById('dev-action-diag');

  if (!diagBox || !itemsEl) return;

  diagBox.classList.remove('hidden');
  badgeEl.className = 'text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30';
  badgeEl.textContent = 'ТЕСТИРОВАНИЕ СИСТЕМ...';
  itemsEl.innerHTML = `<div class="text-gray-400 flex items-center gap-2 py-2"><svg class="w-4 h-4 animate-spin text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> <span>Отправка контрольных пакетов в PostgreSQL, Bot API и JWT...</span></div>`;

  if (btnDiag) btnDiag.disabled = true;

  try {
    const res = await fetch('/api/dev/diagnostics', {
      method: 'POST',
      headers: getDevAuthHeaders()
    });
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'Ошибка выполнения диагностики');
    }

    if (json.allPassed) {
      badgeEl.className = 'text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      badgeEl.textContent = 'ВСЕ СИСТЕМЫ В НОРМЕ (100%)';
    } else {
      badgeEl.className = 'text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-red-500/15 text-red-400 border border-red-500/30';
      badgeEl.textContent = 'ОБНАРУЖЕНЫ ОТКЛОНЕНИЯ';
    }

    itemsEl.innerHTML = json.results.map(item => {
      const isPass = item.status === 'pass';
      const icon = isPass ? 'check-circle' : 'alert-circle';
      const color = isPass ? 'text-emerald-400' : 'text-red-400';
      const border = isPass ? 'border-emerald-500/20 bg-emerald-950/10' : 'border-red-500/20 bg-red-950/10';

      return `
        <div class="flex items-center justify-between p-2.5 rounded-xl border ${border}">
          <div class="flex items-center gap-2 min-w-0">
            <i data-lucide="${icon}" class="w-4 h-4 ${color} shrink-0"></i>
            <span class="font-bold text-white">${esc(item.service)}:</span>
            <span class="text-gray-400 truncate">${esc(item.detail)}</span>
          </div>
          <span class="font-mono text-[11px] text-gray-400 ml-2 shrink-0">${item.latencyMs} ms</span>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();

  } catch (err) {
    badgeEl.className = 'text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-red-500/15 text-red-400 border border-red-500/30';
    badgeEl.textContent = 'СБОЙ ДИАГНОСТИКИ';
    itemsEl.innerHTML = `<div class="text-red-400 p-2">${esc(err.message)}</div>`;
  } finally {
    if (btnDiag) btnDiag.disabled = false;
  }
}

function showDevBanner(msg, type = 'success') {
  const banner = document.getElementById('dev-feedback-banner');
  if (!banner) return;

  const isSucc = type === 'success';
  banner.className = `mt-3 p-3 rounded-xl text-xs font-semibold text-center fade-in ${
    isSucc 
      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
      : 'bg-red-500/15 border border-red-500/30 text-red-300'
  }`;
  banner.textContent = msg;
  banner.classList.remove('hidden');

  setTimeout(() => {
    banner.classList.add('hidden');
  }, 6000);
}

async function sendDevTestPush() {
  const btn = document.getElementById('dev-action-push');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/dev/test-push', {
      method: 'POST',
      headers: getDevAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'Не удалось доставить сообщение');
    }
    showDevBanner('✅ ' + json.message, 'success');
  } catch (err) {
    showDevBanner('❌ Ошибка отправки PUSH: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function clearDevCache() {
  const btn = document.getElementById('dev-action-cache');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/dev/clear-cache', {
      method: 'POST',
      headers: getDevAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'Не удалось очистить кеш');
    }
    showDevBanner('🧹 ' + json.message, 'success');
    refreshDevDashboard(true);
  } catch (err) {
    showDevBanner('❌ Ошибка сброса кеша: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderGreeting() {
  const name = CLIENT.name?.split(' ')[0] || 'Клиент';
  document.getElementById('greeting').textContent = `Привет, ${name}! 👋`;
  document.getElementById('header-name').textContent = CLIENT.name;

  // Level badge
  const levelObj = CLIENT.level || { name: 'Новый', percent: 0 };
  const levelName = levelObj.name || 'Новый';
  
  let cssClass = 'level-newcomer';
  if (levelName === 'Лояльный') cssClass = 'level-loyal';
  else if (levelName === 'Постоянный') cssClass = 'level-regular';
  else if (levelName === 'VIP') cssClass = 'level-veteran';

  document.getElementById('level-badge-el').innerHTML =
    `<span class="level-badge ${cssClass}">★ ${levelName}</span>`;

  // Progress bar
  const validRepairs = (CLIENT.repairs || []).filter(r => r.type !== 'Напоминание');
  const repairsCount = validRepairs.length;

  let from = 0, to = 2, nextLabel = 'До уровня "Лояльный"';
  let isMax = false;

  if (repairsCount >= 10 || levelName === 'VIP') {
    isMax = true;
  } else if (repairsCount >= 5 || levelName === 'Постоянный') {
    from = 5;
    to = 10;
    nextLabel = 'До уровня "VIP"';
  } else if (repairsCount >= 2 || levelName === 'Лояльный') {
    from = 2;
    to = 5;
    nextLabel = 'До уровня "Постоянный"';
  } else {
    from = 0;
    to = 2;
    nextLabel = 'До уровня "Лояльный"';
  }

  const ps = document.getElementById('level-progress-section');
  if (isMax) {
    ps.classList.remove('hidden');
    document.getElementById('level-progress-label').textContent = 'Максимальный уровень: VIP! 🏆';
    document.getElementById('level-progress-val').textContent = `${repairsCount} визитов`;
    setTimeout(() => { document.getElementById('level-progress-fill').style.width = '100%'; }, 300);
  } else {
    const pct = Math.max(0, Math.min(100, Math.round(((repairsCount - from) / (to - from)) * 100)));
    ps.classList.remove('hidden');
    document.getElementById('level-progress-label').textContent = nextLabel;
    document.getElementById('level-progress-val').textContent = `${repairsCount - from} / ${to - from} визитов`;
    setTimeout(() => { document.getElementById('level-progress-fill').style.width = pct + '%'; }, 300);
  }
}

function renderStats() {
  const repairs   = (CLIENT.repairs || []).filter(r => r.type !== 'Напоминание');
  const total     = repairs.reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const avg       = repairs.length ? Math.round(total / repairs.length) : 0;
  const sortedRepairs = [...repairs].sort((a, b) => a.date > b.date ? -1 : 1);
  const lastDate  = sortedRepairs.length ? new Date(sortedRepairs[0].date) : null;
  const daysAgo   = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / 86400000) : '—';

  document.getElementById('stat-visits').textContent = repairs.length;
  document.getElementById('stat-total').textContent  = total ? total.toLocaleString('ru-RU') + ' ₽' : '—';
  document.getElementById('stat-avg').textContent    = avg   ? avg.toLocaleString('ru-RU') + ' ₽'   : '—';
  document.getElementById('stat-days').textContent   = typeof daysAgo === 'number' ? daysAgo : '—';
}

function renderReminders() {
  const allRem = [];
  (CLIENT.repairs || []).forEach(r => {
    if (r.reminder && !r.reminder.done) {
      allRem.push({ repairId: r.id, reminder: r.reminder });
    }
  });

  const sec = document.getElementById('reminders-section');
  if (!allRem.length) { sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');

  document.getElementById('reminders-list').innerHTML = allRem.map(({ repairId, reminder }) => `
    <div class="flex items-center justify-between bg-yellow-400/5 border border-yellow-400/20
                rounded-xl p-3 gap-3">
      <div class="flex items-center gap-2.5">
        <i data-lucide="bell" class="w-4 h-4 text-yellow-400 shrink-0"></i>
        <div>
          <p class="text-sm text-white font-semibold">${esc(reminder.text)}</p>
          <p class="text-xs text-gray-500">${fmtDate(reminder.date)}</p>
        </div>
      </div>
      <button onclick="markReminderDone('${repairId}')"
              class="text-xs text-gray-500 hover:text-green-400 transition-colors whitespace-nowrap">
        ✓ Готово
      </button>
    </div>`).join('');
}

function renderCars() {
  const cars = CLIENT.cars || [];
  const list = document.getElementById('cars-list');
  if (!cars.length) {
    list.innerHTML = '<p class="text-gray-500 text-sm col-span-2">Нет автомобилей — мастер добавит при следующем ремонте.</p>';
    return;
  }
  list.innerHTML = cars.map(car => `
    <div class="car-card">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <i data-lucide="car" class="w-5 h-5 text-accent"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-white text-sm truncate">
            ${esc(car.brand)} ${esc(car.model)} ${car.year || ''}
          </p>
          <p class="text-xs text-gray-500">${esc(car.plate || 'Номер не указан')}</p>
        </div>
        <span class="${car.status === 'ok' ? 'car-status-ok' : 'car-status-warn'} text-lg">
          ${car.status === 'ok' ? '✅' : '⚠️'}
        </span>
      </div>
    </div>`).join('');
}

function renderRepairs() {
  const repairs = [...(CLIENT.repairs || [])].reverse();
  const timeline = document.getElementById('repairs-timeline');
  document.getElementById('repair-count-badge').textContent =
    repairs.length ? `${repairs.length} запис${repairs.length === 1 ? 'ь' : repairs.length < 5 ? 'и' : 'ей'}` : '';

  if (!repairs.length) {
    timeline.innerHTML = '<p class="text-gray-500 text-sm">История пуста — мастер добавит записи после каждого ремонта.</p>';
    return;
  }

  const typeCss = {
    'Диагностика':       'type-diag',
    'Ремонт проводки':   'type-repair',
    'Сигнализация':      'type-alarm',
    'Стартер / Генератор': 'type-gen',
    'Напоминание':       'type-other',
  };

  timeline.innerHTML = repairs.map(r => {
    const cls    = typeCss[r.type] || 'type-other';
    const photos = (r.photos || []).map(p =>
      `<a href="${p}" target="_blank">
         <img src="${p}" class="w-16 h-12 object-cover rounded-lg border border-border hover:border-accent transition-colors" />
       </a>`).join('');
    const rem = r.reminder;
    const carLabel = CLIENT.cars?.find(c => c.id === r.carId);
    return `
    <div class="timeline-item pb-2">
      <div class="card p-4">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="${cls} text-xs font-bold px-2 py-0.5 rounded-full">${esc(r.type)}</span>
              ${carLabel ? `<span class="text-xs text-gray-500">${esc(carLabel.brand)} ${esc(carLabel.model)}</span>` : ''}
            </div>
            <p class="text-xs text-gray-500 mt-1">${fmtDate(r.date)}</p>
          </div>
          ${r.cost ? `<span class="text-accent font-black text-sm shrink-0">${r.cost.toLocaleString('ru-RU')} ₽</span>` : ''}
        </div>
        ${r.description ? `<p class="text-sm text-gray-300 leading-relaxed">${esc(r.description)}</p>` : ''}
        ${photos ? `<div class="flex gap-2 mt-3 flex-wrap">${photos}</div>` : ''}
        ${rem && !rem.done ? `
          <div class="mt-3 flex items-center gap-2 text-yellow-400 text-xs">
            <i data-lucide="bell" class="w-3.5 h-3.5 shrink-0"></i>
            <span>${esc(rem.text)} — ${fmtDate(rem.date)}</span>
          </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderMaster() {
  if (!MASTER) return;
  const contacts = MASTER.contacts || {};
  document.getElementById('master-name').textContent  = MASTER.masterName || 'Мастер AutoElectro';
  document.getElementById('master-phone').textContent = contacts.phone || '';

  const phone = (contacts.phone || '').replace(/[^\d+]/g, '');
  if (phone) document.getElementById('master-call').href = 'tel:' + phone;
  if (contacts.telegram) document.getElementById('master-tg').href = contacts.telegram;
  if (contacts.whatsapp) document.getElementById('master-wa').href = contacts.whatsapp;
}

function renderMascotTip() {
  const tip = MASCOT_TIPS[Math.floor(Math.random() * MASCOT_TIPS.length)];
  document.getElementById('mascot-tip-text').textContent = tip;
}

/* ══════════════════════════════════════════════════════════
   ACTIONS
══════════════════════════════════════════════════════════ */
window.markReminderDone = async (repairId) => {
  try {
    await fetch(`/api/client/reminder/${repairId}`, {
      method:  'PUT',
      headers: { 'x-client-token': TOKEN },
    });
    // Update locally
    const repair = (CLIENT.repairs || []).find(r => r.id === repairId);
    if (repair?.reminder) repair.reminder.done = true;
    renderReminders();
  } catch {}
};

// New request from profile
const profileModal      = document.getElementById('profile-request-modal');
const closeProfileModal = document.getElementById('close-profile-modal');
const formProfileReq    = document.getElementById('form-profile-request');

document.getElementById('btn-new-request')?.addEventListener('click', () => {
  profileModal.classList.remove('hidden');
  profileModal.classList.add('flex');
});
closeProfileModal?.addEventListener('click', () => {
  profileModal.classList.add('hidden');
  profileModal.classList.remove('flex');
});

formProfileReq?.addEventListener('submit', async e => {
  e.preventDefault();
  const problem = new FormData(e.target).get('problem');
  const errEl = document.getElementById('preq-err');
  const okEl  = document.getElementById('preq-ok');
  okEl.classList.add('hidden');
  errEl.classList.add('hidden');

  if (!CLIENT.phone) {
    errEl.textContent = 'Укажите номер телефона в профиле выше, чтобы мастер мог связаться с вами.';
    errEl.classList.remove('hidden');
    if (phoneMissingBanner) {
      phoneMissingBanner.scrollIntoView({ behavior: 'smooth' });
      missingPhoneInput?.focus();
    }
    return;
  }

  try {
    const res  = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: CLIENT.name, phone: CLIENT.phone, problem }),
    });
    const json = await res.json();
    if (json.ok) {
      okEl.classList.remove('hidden');
      e.target.reset();
      setTimeout(() => {
        profileModal.classList.add('hidden');
        profileModal.classList.remove('flex');
      }, 2000);
    } else {
      errEl.textContent = json.error === 'phone required' 
        ? 'Укажите номер телефона в профиле' 
        : (json.error || 'Ошибка. Позвоните мастеру.');
      errEl.classList.remove('hidden');
    }
  } catch {
    errEl.textContent = 'Ошибка сети. Позвоните мастеру.';
    errEl.classList.remove('hidden');
  }
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('ae_admin_token');
  sessionStorage.removeItem('ae_dev_view_mode');
  if (devVitalsTimer) { clearInterval(devVitalsTimer); devVitalsTimer = null; }
  if (devClockTimer) { clearInterval(devClockTimer); devClockTimer = null; }
  TOKEN = ''; CLIENT = null; MASTER = null;
  showLoginScreen();
});

/* ══════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════ */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

function fmtDate(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return str; }
}

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();

  /* ── Magic Link and OAuth Redirection Handling (Levels 3 & 4) ── */
  const urlParams = new URLSearchParams(window.location.search);
  const authType  = urlParams.get('auth');
  const urlToken  = urlParams.get('token');

  // Direct Magic Link: /profile.html?auth=<SESSION_TOKEN>
  if (authType && authType !== 'vk' && authType !== 'error') {
    TOKEN = authType;
    localStorage.setItem(TOKEN_KEY, TOKEN);
    window.history.replaceState({}, '', '/profile.html');
    await loadProfile();
    return;
  }

  if (authType === 'vk' && urlToken) {
    TOKEN = urlToken;
    localStorage.setItem(TOKEN_KEY, TOKEN);
    // Clean URL
    window.history.replaceState({}, '', '/profile.html');
    loadProfile();
    return;
  }

  if (authType === 'error') {
    showLoginScreen();
    const reason = urlParams.get('reason') || 'unknown';
    const msgs = {
      not_configured: 'ВК авторизация ещё не настроена — используйте номер телефона или Telegram.',
      access_denied:  'Вы отказались от авторизации в VK.',
      vk_token:       'Не удалось получить токен авторизации VK.',
      server_error:   'Ошибка сервера при входе через VK. Попробуйте ещё раз.',
    };
    showAuthError(msgs[reason] || `Ошибка авторизации VK: ${reason}`);
    window.history.replaceState({}, '', '/profile.html');
    return;
  }

  /* ── Phone + PIN Login Form Binding (Level 5) ── */
  const pinPhoneInput = document.getElementById('pin-login-phone');
  const pinCodeInput  = document.getElementById('pin-login-code');
  const pinForm       = document.getElementById('pin-login-form');
  const btnPinSubmit  = document.getElementById('btn-pin-submit');

  pinPhoneInput?.addEventListener('input', () => {
    let v = pinPhoneInput.value.replace(/\D/g, '');
    if (v.startsWith('8')) v = '7' + v.slice(1);
    if (v.length > 0 && !v.startsWith('7')) v = '7' + v;
    if (v.length > 11) v = v.slice(0, 11);
    let formatted = '';
    if (v.length >= 1) formatted = '+' + v[0];
    if (v.length >= 2) formatted += ' (' + v.slice(1, 4);
    if (v.length >= 5) formatted += ') ' + v.slice(4, 7);
    if (v.length >= 8) formatted += '-' + v.slice(7, 9);
    if (v.length >= 10) formatted += '-' + v.slice(9, 11);
    pinPhoneInput.value = formatted;
  });

  pinCodeInput?.addEventListener('input', () => {
    pinCodeInput.value = pinCodeInput.value.replace(/\D/g, '').slice(0, 4);
  });

  pinForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();
    const phone = pinPhoneInput?.value.trim();
    const pin = pinCodeInput?.value.trim();

    if (!phone || !pin) {
      showAuthError('Введите номер телефона и 4-значный ПИН-код');
      return;
    }

    if (btnPinSubmit) {
      btnPinSubmit.disabled = true;
      btnPinSubmit.textContent = 'Проверка...';
    }

    try {
      const res = await fetch('/api/client/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin })
      });
      const data = await res.json();
      if (data.ok && data.token) {
        TOKEN = data.token;
        localStorage.setItem(TOKEN_KEY, TOKEN);
        await loadProfile();
      } else {
        showAuthError(data.message || data.error || 'Неверный номер телефона или ПИН-код');
      }
    } catch (err) {
      showAuthError('Ошибка соединения при проверке ПИН-кода: ' + err.message);
    } finally {
      if (btnPinSubmit) {
        btnPinSubmit.disabled = false;
        btnPinSubmit.textContent = 'Войти в гараж';
      }
    }
  });

  checkUrlAuthParams();
  if (TOKEN) {
    await loadProfile();
  } else {
    showLoginScreen();
  }
});

/* ══════════════════════════════════════════════════════════
   TELEGRAM AUTH (BROWSER POPUP / SILENT OAUTH — ZERO BOTS)
══════════════════════════════════════════════════════════ */
let tgPopup = null;

function showAuthError(msg) {
  const errBanner = document.getElementById('auth-error-banner');
  if (errBanner) {
    errBanner.textContent = msg;
    errBanner.classList.remove('hidden');
  }
}

function hideAuthError() {
  const errBanner = document.getElementById('auth-error-banner');
  if (errBanner) errBanner.classList.add('hidden');
}

/* 1. Main Telegram Auth Button: Pure Browser OAuth Popup */
function setupTelegramAuthButton() {
  const tgBtn = document.getElementById('tg-login-btn');
  const tgLabel = document.getElementById('tg-btn-label');
  if (!tgBtn) return;

  tgBtn.onclick = async (e) => {
    e.preventDefault();
    hideAuthError();

    // Close any dangling previous popup
    if (tgPopup && !tgPopup.closed) {
      try { tgPopup.close(); } catch (_) {}
    }
    tgPopup = null;

    if (tgLabel) tgLabel.textContent = 'Открываем Telegram...';

    try {
      const res = await fetch('/api/client/auth/telegram/config');
      const data = await res.json();
      if (!res.ok || !data.ok || !data.botId) {
        throw new Error('Telegram бот временно не настроен');
      }

      const botId = data.botId;
      const origin = encodeURIComponent(window.location.origin);
      const returnTo = encodeURIComponent(window.location.origin + '/profile.html');
      const oauthUrl = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${origin}&request_access=write&return_to=${returnTo}`;

      const width = 550;
      const height = 470;
      const left = Math.round((window.screen.width - width) / 2);
      const top = Math.round((window.screen.height - height) / 2);

      tgPopup = window.open(
        oauthUrl,
        'tg_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left},toolbar=0,menubar=0,location=1,status=1,scrollbars=1,resizable=1`
      );

      if (!tgPopup || tgPopup.closed || typeof tgPopup.closed === 'undefined') {
        // If popup was blocked by browser, redirect current tab
        window.location.href = oauthUrl;
        return;
      }

      if (tgLabel) tgLabel.textContent = 'Подтвердите вход в окне Telegram...';

      // Watch if popup closed without auth
      const popupWatcher = setInterval(() => {
        if (!tgPopup || tgPopup.closed) {
          clearInterval(popupWatcher);
          if (tgLabel && tgLabel.textContent === 'Подтвердите вход в окне Telegram...') {
            tgLabel.textContent = 'Войти через Telegram';
          }
        }
      }, 1000);

    } catch (err) {
      console.error('Telegram auth start error:', err);
      showAuthError(err.message || 'Ошибка открытия окна авторизации Telegram');
      if (tgLabel) tgLabel.textContent = 'Войти через Telegram';
    }
  };
}

/* Helper to extract user from message data (supports telegram-widget format, legacy format, direct objects) */
function extractTgUserFromMessageData(raw) {
  if (!raw) return null;
  let data = raw;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return null; }
  }
  if (!data || typeof data !== 'object') return null;

  // 1. Official telegram-widget.js format: { event: 'auth_user', auth_data: { id, hash, ... } }
  if (data.auth_data && (data.auth_data.id || data.auth_data.hash)) return data.auth_data;
  // 2. Legacy / alternate formats
  if (data.result && (data.result.id || data.result.hash)) return data.result;
  if (data.user && (data.user.id || data.user.hash)) return data.user;
  // 3. Direct user payload
  if (data.id && data.hash) return data;

  return null;
}

/* Listen for auth postMessage from oauth.telegram.org or redirected popup */
window.addEventListener('message', async (event) => {
  const allowed = !event.origin || event.origin.includes('telegram.org') || event.origin === window.location.origin;
  if (!allowed) return;

  try {
    const user = extractTgUserFromMessageData(event.data);
    if (user && user.id && user.hash) {
      console.log('Successfully captured Telegram auth user:', user.id, user.first_name);
      if (tgPopup && !tgPopup.closed) {
        try { tgPopup.close(); } catch (_) {}
      }
      tgPopup = null;
      await window.onTelegramAuth(user);
    }
  } catch (err) {
    console.warn('Error handling postMessage:', err);
  }
});

/* Helper to parse Telegram user from URL (hash #tgAuthResult= or query ?tgAuthResult= or ?id=...&hash=...) */
function extractTgUserFromUrl() {
  const fullHref = window.location.href;
  const match = fullHref.match(/[#?&]tgAuthResult=([A-Za-z0-9\-_=]+)/);
  if (match && match[1]) {
    try {
      let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const json = JSON.parse(window.atob(b64));
      if (json && (json.id || json.hash)) return json;
    } catch (e) {
      console.warn('Failed to parse tgAuthResult base64:', e);
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('id') && urlParams.has('hash')) {
    return {
      id: urlParams.get('id'),
      first_name: urlParams.get('first_name') || '',
      last_name: urlParams.get('last_name') || '',
      username: urlParams.get('username') || '',
      photo_url: urlParams.get('photo_url') || '',
      auth_date: urlParams.get('auth_date') || '',
      hash: urlParams.get('hash') || '',
    };
  }
  return null;
}

/* Check URL parameters for return_to redirect auth */
function checkUrlAuthParams() {
  const user = extractTgUserFromUrl();
  if (!user) return;

  // Clean URL without reloading
  try {
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  } catch (_) {}

  // If this window is a popup opened by our main window, message opener and close
  if (window.opener && window.opener !== window) {
    try {
      window.opener.postMessage({ event: 'auth_user', auth_data: user }, '*');
      setTimeout(() => {
        try { window.close(); } catch (_) {}
      }, 200);
      return;
    } catch (err) {
      console.warn('postMessage to opener failed:', err);
    }
  }

  // Otherwise, process in this window directly
  window.onTelegramAuth(user);
}

/* 2. Demo Client Sandbox Login */
function setupDemoClientButton() {
  const btnDemo = document.getElementById('btn-demo-client');
  if (!btnDemo) return;

  btnDemo.onclick = async (e) => {
    e.preventDefault();
    hideAuthError();

    btnDemo.disabled = true;
    btnDemo.innerHTML = `
      <svg class="w-4 h-4 animate-spin shrink-0 inline mr-2 text-purple-300" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      Вход в демо-гараж...
    `;

    try {
      const res = await fetch('/api/client/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.token) {
        throw new Error(data.message || data.error || 'Не удалось запустить демо-сессию');
      }

      TOKEN = data.token;
      localStorage.setItem(TOKEN_KEY, TOKEN);
      await loadProfile();
    } catch (err) {
      console.error('Demo auth error:', err);
      showAuthError('Ошибка входа в демо-режим: ' + err.message);
      btnDemo.disabled = false;
      btnDemo.innerHTML = '<span>🎭 Войти как тестовый клиент (демо-гараж)</span>';
    }
  };
}

/* ── Telegram Login Callback (HMAC-verified on backend) ── */
window.onTelegramAuth = async function(user) {
  hideAuthError();
  const tgLabel = document.getElementById('tg-btn-label');
  if (tgLabel) tgLabel.textContent = 'Входим в кабинет...';

  try {
    const res = await fetch('/api/client/auth/telegram', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(user),
    });
    const json = await res.json();
    if (json.ok && json.token) {
      TOKEN = json.token;
      localStorage.setItem(TOKEN_KEY, TOKEN);
      await loadProfile();
    } else {
      showAuthError('Ошибка авторизации Telegram: ' + (json.message || json.error || 'Не удалось войти'));
      if (tgLabel) tgLabel.textContent = 'Войти через Telegram';
    }
  } catch (e) {
    showAuthError('Ошибка соединения: ' + e.message);
    if (tgLabel) tgLabel.textContent = 'Войти через Telegram';
  }
};

/* ══════════════════════════════════════════════════════════
   VK ID AUTH (ONE TAP & LOWCODE SDK)
══════════════════════════════════════════════════════════ */
let isVkIdInitialized = false;

function initVkIdAuth() {
  if (isVkIdInitialized) return;

  const container = document.getElementById('vk-onetap-container');
  const fallbackBtn = document.getElementById('vk-fallback-btn');
  if (!container && !fallbackBtn) return;

  if (typeof window.VKIDSDK === 'undefined') {
    // Retry in 300ms in case CDN script is still downloading
    setTimeout(initVkIdAuth, 300);
    return;
  }

  try {
    isVkIdInitialized = true;
    const VKID = window.VKIDSDK;

    // Use exact registered redirect URL matching VK ID console settings
    const redirectUrl = 'https://auto-electrician-landing.vercel.app/api/client/auth/vk/callback';

    VKID.Config.init({
      app: 54777601,
      redirectUrl: redirectUrl,
      responseMode: VKID.ConfigResponseMode.Callback,
      source: VKID.ConfigSource.LOWCODE,
      scope: '',
    });

    // Wire fallback button directly to /api/client/auth/vk/login
    if (fallbackBtn) {
      fallbackBtn.onclick = (e) => {
        e.preventDefault();
        hideAuthError();
        window.location.href = '/api/client/auth/vk/login';
      };
    }

    if (container) {
      const oneTap = new VKID.OneTap();

      oneTap.render({
        container: container,
        showAlternativeLogin: true,
      })
      .on(VKID.WidgetEvents.ERROR, (err) => {
        console.warn('VK OneTap Widget Notice:', err);
        // If One Tap fails, unhide fallback button
        if (fallbackBtn) fallbackBtn.classList.remove('hidden');
      })
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
        hideAuthError();
        try {
          const code = payload.code;
          const deviceId = payload.device_id;

          const tokenData = await VKID.Auth.exchangeCode(code, deviceId);
          if (!tokenData || !tokenData.access_token) {
            throw new Error('Не получен access_token от VK ID');
          }

          const res = await fetch('/api/client/auth/vk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: tokenData.access_token,
              user_id: tokenData.user_id,
              id_token: tokenData.id_token
            })
          });

          const data = await res.json();
          if (data.ok && data.token) {
            TOKEN = data.token;
            localStorage.setItem(TOKEN_KEY, TOKEN);
            await loadProfile();
          } else {
            showAuthError('Ошибка входа через VK ID: ' + (data.message || data.error || 'не удалось подтвердить сессию'));
          }
        } catch (err) {
          console.error('VK ID Login process error:', err);
          showAuthError('Ошибка авторизации через VK: ' + (err.error_description || err.message || 'попробуйте войти по кнопке ниже'));
          if (fallbackBtn) fallbackBtn.classList.remove('hidden');
        }
      });
    }

  } catch (e) {
    console.warn('Failed to init VK ID widget:', e);
    if (fallbackBtn) fallbackBtn.classList.remove('hidden');
  }
}

