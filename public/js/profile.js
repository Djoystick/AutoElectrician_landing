/* ============================================================
   profile.js — Личный кабинет клиента AutoElectro v1.1
   Авторизация: Telegram Widget | VK OAuth | Телефон + OTP
============================================================ */
'use strict';

window.onerror = function(msg, url, lineNo, columnNo, error) {
  fetch('/api/debug', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'onerror', msg, url, lineNo, columnNo, stack: error?.stack }) });
};
window.addEventListener("unhandledrejection", function(event) {
  fetch('/api/debug', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'unhandledrejection', msg: event.reason }) });
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
    } else {
      missingPhoneError.textContent = 'Ошибка сохранения';
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

    if (res.status === 401) {
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
let isTgMagicLinkInitialized = false;

function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('profile-screen').classList.add('hidden');
  lucide.createIcons();
  
  if (!isTgMagicLinkInitialized) {
    initTelegramMagicLink();
    isTgMagicLinkInitialized = true;
  }
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
  const levelObj = CLIENT.level || { name: 'Новичок', percent: 0 };
  const levelName = levelObj.name || 'Новичок';
  
  let cssClass = 'level-newcomer';
  if (levelName === 'Постоянный' || levelName === 'Лояльный') cssClass = 'level-regular';
  if (levelName === 'VIP') cssClass = 'level-veteran';

  document.getElementById('level-badge-el').innerHTML =
    `<span class="level-badge ${cssClass}">★ ${levelName}</span>`;

  // Progress bar
  const repairs = (CLIENT.repairs || []).length;
  const targets = { newcomer: [0, 3], regular: [3, 6], veteran: [6, 6] };
  const [from, to] = targets[level] || [0, 3];
  const pct = to > from ? Math.min(100, Math.round((repairs - from) / (to - from) * 100)) : 100;
  const nextLabels = { newcomer: 'До уровня "Постоянный"', regular: 'До уровня "Ветеран"', veteran: 'Максимальный уровень!' };
  const ps = document.getElementById('level-progress-section');
  if (level !== 'veteran') {
    ps.classList.remove('hidden');
    document.getElementById('level-progress-label').textContent = nextLabels[level];
    document.getElementById('level-progress-val').textContent = `${repairs - from} / ${to - from} визитов`;
    setTimeout(() => { document.getElementById('level-progress-fill').style.width = pct + '%'; }, 300);
  }
}

function renderStats() {
  const repairs   = CLIENT.repairs || [];
  const total     = repairs.reduce((s, r) => s + (r.cost || 0), 0);
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
  document.getElementById('preq-ok').classList.add('hidden');
  document.getElementById('preq-err').classList.add('hidden');
  try {
    const res  = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: CLIENT.name, phone: CLIENT.phone, problem }),
    });
    const json = await res.json();
    if (json.ok) {
      document.getElementById('preq-ok').classList.remove('hidden');
      e.target.reset();
      setTimeout(() => {
        profileModal.classList.add('hidden');
        profileModal.classList.remove('flex');
      }, 2000);
    } else {
      document.getElementById('preq-err').classList.remove('hidden');
    }
  } catch {
    document.getElementById('preq-err').classList.remove('hidden');
  }
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('ae_admin_token');
  TOKEN = ''; CLIENT = null; MASTER = null;
  showLoginScreen();
  // Reset OTP form
  stepPhone.classList.remove('hidden');
  stepOtp.classList.add('hidden');
  inputPhone.value = '';
  inputCode.value  = '';
});

/* ══════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════ */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

  // Handle VK OAuth redirect (token in URL params)
  const urlParams = new URLSearchParams(window.location.search);
  const authType  = urlParams.get('auth');
  const urlToken  = urlParams.get('token');

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
      not_configured: 'ВК авторизация ещё не настроена — используйте номер телефона.',
      access_denied:  'Вы отказались от авторизации.',
      server_error:   'Ошибка сервера. Попробуйте ещё раз.',
    };
    phoneErr.textContent = msgs[reason] || `Ошибка: ${reason}`;
    phoneErr.classList.remove('hidden');
    window.history.replaceState({}, '', '/profile.html');
    return;
  }

  if (TOKEN) {
    await loadProfile();
  } else {
    showLoginScreen();
  }
});

/* ══════════════════════════════════════════════════════════
   TELEGRAM MAGIC LINK INITIATION & POLLING
══════════════════════════════════════════════════════════ */
let magicPollInterval = null;
let magicCountdownInterval = null;

async function initTelegramMagicLink() {
  try {
    // Clean up old intervals
    if (magicPollInterval) clearInterval(magicPollInterval);
    if (magicCountdownInterval) clearInterval(magicCountdownInterval);

    const res = await fetch('/api/client/auth/telegram/magic?t=' + Date.now());
    const data = await res.json();
    if (!data.sessionId || !data.code || !data.botUsername) {
      console.error('Magic link error:', data);
      return;
    }

    const botUrl = `https://t.me/${data.botUsername}?start=auth_${data.sessionId}`;
    const tgBtn = document.getElementById('tg-login-btn');
    
    // Rewrite the entire login area to show the code UI
    const loginArea = tgBtn ? tgBtn.closest('.space-y-3, div') : null;
    const container = tgBtn ? tgBtn.parentElement : null;

    if (tgBtn) {
      // Update the main button to open the bot
      tgBtn.href = botUrl;
      tgBtn.target = '_blank';
      tgBtn.onclick = (e) => { e.preventDefault(); window.open(botUrl, '_blank'); };
      tgBtn.innerHTML = `
        <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
        </svg>
        Авторизация через Telegram (1 клик)
      `;
    }

    // Inject code block after the button
    const existingCodeBlock = document.getElementById('tg-code-block');
    if (existingCodeBlock) existingCodeBlock.remove();

    const codeBlock = document.createElement('div');
    codeBlock.id = 'tg-code-block';
    codeBlock.style.cssText = `
      margin-top: 12px;
      padding: 16px;
      background: rgba(0,180,253,0.07);
      border: 1px solid rgba(0,180,253,0.25);
      border-radius: 12px;
      text-align: center;
    `;
    codeBlock.innerHTML = `
      <p style="color:#7d8590;font-size:0.78rem;margin:0 0 12px;">Нажмите кнопку выше, чтобы запустить бота</p>
      <a href="${botUrl}" 
         target="_blank" 
         class="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#0088cc] hover:bg-[#0077b3] transition-colors gap-2 items-center">
        <i data-lucide="send" class="w-4 h-4"></i>
        Открыть бота
      </a>
      <p style="color:#f59e0b;font-size:0.72rem;margin:12px 0 0;">Ссылка действует <span id="tg-code-timer" style="font-weight:700;">10:00</span></p>
      <p style="color:#3fb950;font-size:0.72rem;margin:6px 0 0;">&#128994; Ожидание входа в Telegram...</p>
    `;

    if (tgBtn && tgBtn.parentElement) {
      tgBtn.parentElement.insertBefore(codeBlock, tgBtn.nextSibling);
      if (window.lucide) window.lucide.createIcons({ root: codeBlock });
    }

    // Countdown timer (10 min)
    let secondsLeft = 10 * 60;
    magicCountdownInterval = setInterval(() => {
      secondsLeft--;
      const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
      const s = (secondsLeft % 60).toString().padStart(2, '0');
      const timerEl = document.getElementById('tg-code-timer');
      if (timerEl) timerEl.textContent = `${m}:${s}`;
      if (secondsLeft <= 0) {
        clearInterval(magicCountdownInterval);
        clearInterval(magicPollInterval);
        // Auto-refresh with a new code
        initTelegramMagicLink();
      }
    }, 1000);

    // Poll for approval
    magicPollInterval = setInterval(async () => {
      try {
        const pRes = await fetch(`/api/client/auth/telegram/magic/status?session=${data.sessionId}`);
        const pData = await pRes.json();
        if (pData.status === 'success') {
          clearInterval(magicPollInterval);
          clearInterval(magicCountdownInterval);
          TOKEN = pData.token;
          localStorage.setItem(TOKEN_KEY, TOKEN);
          await loadProfile();
        } else if (pData.status === 'expired') {
          clearInterval(magicPollInterval);
          clearInterval(magicCountdownInterval);
          initTelegramMagicLink(); // Generate new code
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 2000);

  } catch (e) {
    console.error('Failed to init Telegram magic link', e);
  }
}

/* ── Telegram Login Widget ── */
function injectTelegramWidget() {
  // Fetch bot username from server config
  fetch('/api/data')
    .then(r => r.json())
    .then(data => {
      const botName = data.settings?.telegramBotUsername;
      if (!botName) return; // Widget requires bot username

      // Replace fallback button with real widget
      const wrap = document.getElementById('tg-widget-wrap');
      if (!wrap) return;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login',   botName);
      script.setAttribute('data-size',             'large');
      script.setAttribute('data-radius',           '12');
      script.setAttribute('data-onauth',           'onTelegramAuth(user)');
      script.setAttribute('data-request-access',   'write');
      wrap.innerHTML = '';
      wrap.appendChild(script);
    })
    .catch(() => {});
}

/* Called by Telegram Widget after user auth */
window.onTelegramAuth = async function(user) {
  try {
    fetch('/api/debug', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'onauth_triggered', user: user.id }) }).catch(()=>{});
    
    const res  = await fetch('/api/client/auth/telegram', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(user),
    });
    const json = await res.json();
    
    fetch('/api/debug', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'onauth_response', ok: json.ok }) }).catch(()=>{});

    if (json.ok) {
      TOKEN = json.token;
      localStorage.setItem(TOKEN_KEY, TOKEN);
      await loadProfile();
    } else {
      alert('Ошибка авторизации: ' + (json.error || ''));
    }
  } catch (e) {
    alert('Ошибка соединения: ' + e.message);
  }
};
