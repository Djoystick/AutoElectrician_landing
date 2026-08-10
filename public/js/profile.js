/* ============================================================
   profile.js — Личный кабинет клиента AutoElectro v1.0
   Авторизация по телефону + Telegram OTP
   Лаборатория: гараж, история, статистика, геймификация
============================================================ */
'use strict';

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
   AUTH FLOW
══════════════════════════════════════════════════════════ */
const stepPhone  = document.getElementById('step-phone');
const stepOtp    = document.getElementById('step-otp');
const inputPhone = document.getElementById('input-phone');
const inputCode  = document.getElementById('input-code');
const phoneErr   = document.getElementById('phone-error');
const otpErr     = document.getElementById('otp-error');
const otpHint    = document.getElementById('otp-hint');
const manualBox  = document.getElementById('manual-code-box');
const manualVal  = document.getElementById('manual-code-val');

// Format phone as user types
inputPhone?.addEventListener('input', () => {
  let v = inputPhone.value.replace(/\D/g, '');
  if (v.startsWith('8')) v = '7' + v.slice(1);
  if (v.length > 0 && !v.startsWith('7')) v = '7' + v;
  if (v.length > 11) v = v.slice(0, 11);
  // Format: +7 (XXX) XXX-XX-XX
  let formatted = '';
  if (v.length >= 1) formatted = '+' + v[0];
  if (v.length >= 2) formatted += ' (' + v.slice(1, 4);
  if (v.length >= 5) formatted += ') ' + v.slice(4, 7);
  if (v.length >= 8) formatted += '-' + v.slice(7, 9);
  if (v.length >= 10) formatted += '-' + v.slice(9, 11);
  inputPhone.value = formatted;
});

// Auto-submit OTP when 6 digits entered
inputCode?.addEventListener('input', () => {
  inputCode.value = inputCode.value.replace(/\D/g, '').slice(0, 6);
  if (inputCode.value.length === 6) verifyCode();
});

document.getElementById('btn-send-code')?.addEventListener('click', sendCode);
document.getElementById('btn-verify-code')?.addEventListener('click', verifyCode);
document.getElementById('btn-back-phone')?.addEventListener('click', () => {
  stepOtp.classList.add('hidden');
  stepPhone.classList.remove('hidden');
  manualBox.classList.add('hidden');
  otpErr.classList.add('hidden');
});

async function sendCode() {
  const raw   = inputPhone.value.replace(/[\s\-()]/g, '');
  const phone = raw.startsWith('+') ? raw : '+' + raw;
  phoneErr.classList.add('hidden');

  if (!/^\+7\d{10}$/.test(phone)) {
    phoneErr.textContent = 'Введите корректный номер телефона';
    phoneErr.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('btn-send-code');
  btn.disabled = true;
  btn.textContent = 'Отправляем…';

  try {
    const res  = await fetch('/api/client/auth/request', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone }),
    });
    const json = await res.json();

    if (!json.ok) {
      if (json.error === 'client_not_found') {
        phoneErr.textContent = 'Номер не найден. Обратитесь к мастеру для создания профиля.';
      } else {
        phoneErr.textContent = 'Ошибка. Попробуйте ещё раз.';
      }
      phoneErr.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Получить код';
      lucide.createIcons();
      return;
    }

    // Switch to OTP step
    stepPhone.classList.add('hidden');
    stepOtp.classList.remove('hidden');

    if (json.deliveryMode === 'telegram') {
      otpHint.textContent = `✅ Код отправлен в Telegram (${json.clientName}). Проверьте сообщения от бота.`;
      manualBox.classList.add('hidden');
    } else {
      otpHint.textContent = `Telegram не привязан. Ваш код ниже — или попросите у мастера.`;
      manualVal.textContent = json.code || '—';
      manualBox.classList.remove('hidden');
    }
    inputCode.focus();

  } catch {
    phoneErr.textContent = 'Ошибка соединения. Попробуйте позже.';
    phoneErr.classList.remove('hidden');
  }

  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Получить код';
  lucide.createIcons();
}

async function verifyCode() {
  const raw   = inputPhone.value.replace(/[\s\-()]/g, '');
  const phone = raw.startsWith('+') ? raw : '+' + raw;
  const code  = inputCode.value.trim();
  otpErr.classList.add('hidden');

  if (code.length < 6) {
    otpErr.textContent = 'Введите полный 6-значный код';
    otpErr.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('btn-verify-code');
  btn.disabled = true;
  btn.textContent = 'Проверяем…';

  try {
    const res  = await fetch('/api/client/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone, code }),
    });
    const json = await res.json();

    if (json.ok) {
      TOKEN = json.token;
      localStorage.setItem(TOKEN_KEY, TOKEN);
      await loadProfile();
    } else {
      const msgs = {
        wrong_code:   'Неверный код. Попробуйте ещё раз.',
        code_expired: 'Код истёк. Вернитесь и запросите новый.',
      };
      otpErr.textContent = msgs[json.error] || 'Ошибка авторизации.';
      otpErr.classList.remove('hidden');
    }
  } catch {
    otpErr.textContent = 'Ошибка соединения.';
    otpErr.classList.remove('hidden');
  }

  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i> Войти';
  lucide.createIcons();
}

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
  lucide.createIcons();
}

function showProfileScreen() {
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
  const level = CLIENT.level || 'newcomer';
  const labels = { newcomer: '🔩 Новичок', regular: '⚡ Постоянный', veteran: '🏆 Ветеран гаража' };
  const css    = { newcomer: 'level-newcomer', regular: 'level-regular', veteran: 'level-veteran' };
  document.getElementById('level-badge-el').innerHTML =
    `<span class="level-badge ${css[level]}">${labels[level]}</span>`;

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
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  if (TOKEN) {
    loadProfile();
  } else {
    showLoginScreen();
  }
});
