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

  renderGreeting();
  renderStats();
  renderReminders();
  renderCars();
  renderRepairs();
  renderMaster();
  renderMascotTip();

  lucide.createIcons();
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
  const lastDate  = repairs.length ? new Date(repairs[repairs.length - 1].date) : null;
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

  if (TOKEN) {
    await loadProfile();
  } else {
    showLoginScreen();
  }
});

/* ══════════════════════════════════════════════════════════
   TELEGRAM AUTH (DIRECT APP LAUNCH & WEBHOOK CONFIRMATION)
══════════════════════════════════════════════════════════ */
let tgSessionId = null;
let tgPollInterval = null;

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

/* 1. Main Telegram Auth Button Handler */
function setupTelegramAuthButton() {
  const tgBtn = document.getElementById('tg-login-btn');
  const tgLabel = document.getElementById('tg-btn-label');
  const statusBox = document.getElementById('tg-status-box');
  const reopenLink = document.getElementById('tg-reopen-link');
  if (!tgBtn) return;

  const triggerTelegramLogin = async () => {
    hideAuthError();
    if (statusBox) statusBox.classList.remove('hidden');
    if (tgLabel) tgLabel.textContent = 'Подключение к Telegram...';

    try {
      if (!tgSessionId) {
        const res = await fetch('/api/client/auth/telegram/magic?t=' + Date.now());
        const data = await res.json();
        if (!res.ok || !data.ok || !data.sessionId) {
          throw new Error(data.message || 'Ошибка инициализации сессии');
        }
        tgSessionId = data.sessionId;
      }

      // Native protocol tg:// directly opens Telegram app without web t.me blocks
      const tgAppUrl = `tg://resolve?domain=Autoelectrical_Official_bot&start=auth_${tgSessionId}`;
      window.location.href = tgAppUrl;

      if (tgLabel) tgLabel.textContent = 'Ожидаем подтверждения в боте...';

      if (reopenLink) {
        reopenLink.onclick = (e) => {
          e.preventDefault();
          window.location.href = tgAppUrl;
        };
      }

      // Start polling for user confirmation
      if (tgPollInterval) clearInterval(tgPollInterval);
      tgPollInterval = setInterval(async () => {
        try {
          const sRes = await fetch(`/api/client/auth/telegram/magic/status?session=${tgSessionId}`);
          const sData = await sRes.json();
          if (sData.status === 'success') {
            clearInterval(tgPollInterval);
            TOKEN = sData.token;
            localStorage.setItem(TOKEN_KEY, TOKEN);
            await loadProfile();
          }
        } catch {}
      }, 2000);

    } catch (err) {
      console.error('Telegram auth error:', err);
      showAuthError('Ошибка запуска Telegram: ' + err.message);
      if (tgLabel) tgLabel.textContent = 'Войти через Telegram';
      if (statusBox) statusBox.classList.add('hidden');
    }
  };

  tgBtn.onclick = (e) => {
    e.preventDefault();
    triggerTelegramLogin();
  };
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

/* ── Telegram Login Widget Callback (HMAC-verified on backend if widget is used) ── */
window.onTelegramAuth = async function(user) {
  hideAuthError();
  try {
    const res = await fetch('/api/client/auth/telegram', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(user),
    });
    const json = await res.json();
    if (json.ok) {
      TOKEN = json.token;
      localStorage.setItem(TOKEN_KEY, TOKEN);
      await loadProfile();
    } else {
      showAuthError('Ошибка авторизации Telegram: ' + (json.message || json.error || ''));
    }
  } catch (e) {
    showAuthError('Ошибка соединения: ' + e.message);
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

