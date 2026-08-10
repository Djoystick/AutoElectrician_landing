/* ============================================================
   admin.js — AutoElectro Admin Panel v2.0
   Полная CRM: обзор, заявки, клиенты, аналитика
============================================================ */
'use strict';

/* ── State ── */
let TOKEN = localStorage.getItem('ae_admin_token') || '';
let DATA  = {};
let ANALYTICS = {};
let dragSrcIndex = null; // for drag-and-drop

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  if (TOKEN) loadAndShow();
  bindEvents();
});

/* ══════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════ */
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const pwd = document.getElementById('login-pwd').value.trim();
  const err = document.getElementById('login-err');
  err.classList.add('hidden');
  try {
    const res  = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pwd }) });
    const json = await res.json();
    if (json.ok) { TOKEN = pwd; localStorage.setItem('ae_admin_token', TOKEN); loadAndShow(); }
    else err.classList.remove('hidden');
  } catch { err.textContent = 'Ошибка соединения'; err.classList.remove('hidden'); }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  TOKEN = ''; localStorage.removeItem('ae_admin_token');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('flex');
  document.getElementById('login-screen').classList.remove('hidden');
});

/* ══════════════════════════════════════════════════════════
   LOAD & SHOW
══════════════════════════════════════════════════════════ */
async function loadAndShow() {
  [DATA, ANALYTICS] = await Promise.all([
    fetch('/api/data').then(r => r.json()),
    api('GET', '/api/analytics'),
  ]);

  document.getElementById('login-screen').classList.add('hidden');
  const dash = document.getElementById('dashboard');
  dash.classList.remove('hidden');
  dash.classList.add('flex', 'flex-col');

  renderOverview();
  renderRequests();
  renderClients();
  renderAnalytics();
  populateContacts();
  populateSettings();
  renderServicesAdmin();
  renderReviewsAdmin();
  lucide.createIcons();
}

/* ══════════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════════ */
function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // KPI widget click → switch tab
  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.goto));
  });

  // Overview "all requests" link
  document.querySelectorAll('[data-goto]').forEach(el => {
    if (el.tagName === 'BUTTON') el.addEventListener('click', () => switchTab(el.dataset.goto));
  });

  bindServiceForm();
  bindReviewForm();
  bindClientForm();
  bindRequestForm();
  bindRepairForm();
  bindClientsSearch();
  bindIconPreview();

  document.getElementById('btn-add-service').addEventListener('click', () => openServiceModal(null));
  document.getElementById('btn-add-review').addEventListener('click', () => openReviewModal(null));
  document.getElementById('btn-add-client').addEventListener('click', () => openModal('modal-client'));
  document.getElementById('btn-add-manual-request').addEventListener('click', () => openModal('modal-manual-request'));

  document.getElementById('form-contacts').addEventListener('submit', async e => {
    e.preventDefault();
    const res = await api('PUT', '/api/contacts', formToObj(e.target));
    if (res.ok) { DATA.contacts = res.contacts; toast('Контакты сохранены'); }
  });

  document.getElementById('form-settings').addEventListener('submit', async e => {
    e.preventDefault();
    const { newPassword, ...rest } = formToObj(e.target);
    rest.acceptingRequests = document.getElementById('cb-accepting').checked;
    if (newPassword) { rest.password = newPassword; TOKEN = newPassword; localStorage.setItem('ae_admin_token', TOKEN); }
    const res = await api('PUT', '/api/settings', rest);
    if (res.ok) toast('Настройки сохранены');
  });
}

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
    b.classList.toggle('text-gray-400', b.dataset.tab !== name);
  });
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
  const pane = document.getElementById('tab-' + name);
  if (pane) pane.classList.remove('hidden');
  lucide.createIcons();
}

/* ══════════════════════════════════════════════════════════
   OVERVIEW
══════════════════════════════════════════════════════════ */
function renderOverview() {
  // KPI
  document.getElementById('kpi-requests-val').textContent = ANALYTICS.newRequests ?? 0;
  document.getElementById('kpi-clients-val').textContent  = ANALYTICS.totalClients ?? 0;
  document.getElementById('kpi-visits-val').textContent   = ANALYTICS.monthVisits ?? 0;
  document.getElementById('kpi-churn-val').textContent    = ANALYTICS.churnCount ?? 0;

  // Badge on requests tab
  if (ANALYTICS.newRequests > 0) {
    const badge = document.getElementById('new-requests-badge');
    badge.textContent = ANALYTICS.newRequests;
    badge.classList.remove('hidden');
  }

  // Recent requests (last 5)
  const reqContainer = document.getElementById('overview-recent-requests');
  const reqs = (DATA.requests || []).slice(0, 5);
  if (!reqs.length) { reqContainer.innerHTML = '<p class="text-gray-500 text-sm">Заявок пока нет</p>'; }
  else {
    reqContainer.innerHTML = reqs.map(r => `
      <div class="flex items-center justify-between py-2 border-b border-border last:border-0">
        <div>
          <span class="font-semibold text-white">${esc(r.name)}</span>
          <span class="text-gray-500 ml-2">${esc(r.phone)}</span>
          ${r.problem ? `<span class="text-gray-500 ml-2">— ${esc(r.problem.slice(0,40))}</span>` : ''}
        </div>
        <span class="status-badge status-${r.status} px-2 py-0.5 rounded-full text-xs font-semibold shrink-0">${statusLabel(r.status)}</span>
      </div>`).join('');
  }

  // Churn clients
  const churnContainer = document.getElementById('overview-churn');
  const churn = ANALYTICS.churnClients || [];
  if (!churn.length) { churnContainer.innerHTML = '<p class="text-gray-500 text-sm">Нет клиентов в зоне оттока 👍</p>'; }
  else {
    churnContainer.innerHTML = churn.map(c => `
      <div class="flex items-center justify-between py-2 border-b border-border last:border-0">
        <div>
          <span class="font-semibold text-white">${esc(c.name)}</span>
          ${c.lastRepairDate ? `<span class="text-gray-500 ml-2 text-xs">Последний визит: ${fmtDate(c.lastRepairDate)}</span>` : ''}
        </div>
        <a href="tel:${c.phone}" class="btn-ghost text-xs py-1 px-3">
          <i data-lucide="phone" class="w-3.5 h-3.5"></i> ${esc(c.phone)}
        </a>
      </div>`).join('');
  }
}

/* ══════════════════════════════════════════════════════════
   REQUESTS
══════════════════════════════════════════════════════════ */
async function loadRequests() {
  const res = await api('GET', '/api/requests');
  DATA.requests = res.requests || [];
  renderRequests();
}

function renderRequests() {
  const list = document.getElementById('requests-list');
  const reqs = DATA.requests || [];
  if (!reqs.length) {
    list.innerHTML = '<p class="text-gray-500 text-sm py-4">Заявок нет</p>';
    return;
  }
  list.innerHTML = reqs.map(r => `
    <div class="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-bold text-white">${esc(r.name)}</span>
          <span class="status-badge status-${r.status} px-2 py-0.5 rounded-full text-xs font-semibold">${statusLabel(r.status)}</span>
        </div>
        <a href="tel:${r.phone}" class="text-accent text-sm hover:underline">${esc(r.phone)}</a>
        ${r.problem ? `<p class="text-gray-400 text-sm mt-1">${esc(r.problem)}</p>` : ''}
        <p class="text-gray-600 text-xs mt-1">${fmtDateTime(r.createdAt)}</p>
      </div>
      <div class="flex flex-wrap gap-2 shrink-0">
        ${r.status !== 'work'   ? `<button onclick="setRequestStatus('${r.id}','work')"   class="btn-ghost text-xs py-1.5">🟡 В работе</button>` : ''}
        ${r.status !== 'done'   ? `<button onclick="setRequestStatus('${r.id}','done')"   class="btn-ghost text-xs py-1.5">🟢 Выполнена</button>` : ''}
        ${r.status !== 'cancel' ? `<button onclick="setRequestStatus('${r.id}','cancel')" class="btn-ghost text-xs py-1.5 text-red-400">⛔ Отмена</button>` : ''}
        <button onclick="deleteRequest('${r.id}')" class="btn-danger text-xs py-1.5">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    </div>`).join('');
  lucide.createIcons();
}

window.setRequestStatus = async (id, status) => {
  const res = await api('PUT', `/api/requests/${id}/status`, { status });
  if (res.ok) {
    const req = DATA.requests.find(r => r.id === id);
    if (req) req.status = status;
    renderRequests();
    toast('Статус обновлён');
    // If done → offer to add repair
    if (status === 'done') {
      const r = DATA.requests.find(r => r.id === id);
      if (r && confirm(`Заявка выполнена. Добавить запись о ремонте для клиента ${r.name}?`)) {
        // Prefill repair modal
        document.getElementById('repair-client-id').value = '';
        openRepairModal(null, { name: r.name, phone: r.phone });
      }
    }
  }
};

window.deleteRequest = async (id) => {
  if (!confirm('Удалить заявку?')) return;
  await api('DELETE', `/api/requests/${id}`);
  DATA.requests = (DATA.requests || []).filter(r => r.id !== id);
  renderRequests();
};

function bindRequestForm() {
  document.getElementById('form-manual-request').addEventListener('submit', async e => {
    e.preventDefault();
    const body = formToObj(e.target);
    const res  = await fetch('/api/requests', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const json = await res.json();
    if (json.ok) {
      await loadRequests();
      closeModal('modal-manual-request');
      e.target.reset();
      toast('Заявка добавлена');
    }
  });
}

/* ══════════════════════════════════════════════════════════
   CLIENTS CRM
══════════════════════════════════════════════════════════ */
async function loadClients() {
  const res = await api('GET', '/api/clients');
  DATA.clientsSummary = res.clients || [];
  renderClients();
}

function renderClients(filter = '') {
  const list    = document.getElementById('clients-list');
  let clients   = DATA.clientsSummary || [];
  if (filter) {
    const q = filter.toLowerCase();
    clients = clients.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      (c.cars || []).some(car => `${car.brand} ${car.model} ${car.plate}`.toLowerCase().includes(q))
    );
  }
  if (!clients.length) {
    list.innerHTML = `<p class="text-gray-500 text-sm py-4">${filter ? 'Ничего не найдено' : 'Клиентов пока нет'}</p>`;
    return;
  }
  list.innerHTML = clients.map(c => {
    const carStr  = c.cars?.length ? c.cars.map(car => `${car.brand} ${car.model}`).join(', ') : 'Нет авто';
    const badge   = levelBadge(c.level);
    const retCls  = `retention-${c.retention || 'none'}`;
    return `
    <div class="card p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${retCls} pl-5">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <span class="font-bold text-white text-sm">${esc(c.name)}</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">${badge}</span>
          ${c.telegramLinked ? '<span class="text-xs text-blue-400">✈ TG</span>' : ''}
        </div>
        <div class="text-sm text-gray-400 flex flex-wrap gap-3">
          <span>${esc(c.phone)}</span>
          <span class="text-gray-600">•</span>
          <span>${esc(carStr)}</span>
          <span class="text-gray-600">•</span>
          <span>${c.repairCount} визит${pluralRu(c.repairCount)}</span>
          ${c.lastRepairDate ? `<span class="text-gray-600">• Последний: ${fmtDate(c.lastRepairDate)}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-2 shrink-0">
        <a href="tel:${c.phone}" class="btn-ghost text-xs py-1.5">
          <i data-lucide="phone" class="w-3.5 h-3.5"></i>
        </a>
        <button onclick="openClientDetail('${c.id}')" class="btn-primary text-xs py-1.5">
          <i data-lucide="folder-open" class="w-3.5 h-3.5"></i> Открыть
        </button>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}

function bindClientsSearch() {
  document.getElementById('clients-search').addEventListener('input', e => {
    renderClients(e.target.value.trim());
  });
}

function bindClientForm() {
  document.getElementById('form-client').addEventListener('submit', async e => {
    e.preventDefault();
    const body = formToObj(e.target);
    const res  = await api('POST', '/api/clients', body);
    if (res.ok) {
      closeModal('modal-client');
      e.target.reset();
      await loadClients();
      toast(`Клиент ${res.client.name} создан. Код: ${res.client.accessCode}`);
    } else if (res.error === 'client_exists') {
      toast('Клиент с таким телефоном уже существует', true);
    }
  });
}

/* ── Client Detail Modal ── */
window.openClientDetail = async (id) => {
  const res = await api('GET', `/api/clients/${id}`);
  if (!res.ok) return;
  const c = res.client;
  document.getElementById('client-detail-name').textContent = c.name;
  document.getElementById('client-detail-content').innerHTML = renderClientDetail(c);
  openModal('modal-client-detail');
  lucide.createIcons();
};

function renderClientDetail(c) {
  const repairs  = (c.repairs || []).slice().reverse();
  const carsHtml = (c.cars || []).map(car => `
    <div class="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span class="text-sm text-white">${esc(car.brand)} ${esc(car.model)} ${car.year || ''} — <span class="text-gray-400">${esc(car.plate || '')}</span></span>
      <button onclick="deleteCar('${c.id}','${car.id}')" class="btn-danger text-xs py-1 px-2">
        <i data-lucide="trash-2" class="w-3 h-3"></i>
      </button>
    </div>`).join('') || '<p class="text-gray-500 text-sm">Нет автомобилей</p>';

  const repairsHtml = repairs.length ? repairs.map(r => {
    const typeCls = typeColor(r.type);
    const photos  = (r.photos || []).map(p => `<a href="${p}" target="_blank"><img src="${p}" class="w-16 h-12 object-cover rounded-lg border border-border hover:border-accent transition-colors" /></a>`).join('');
    const rem     = r.reminder;
    return `
    <div class="timeline-item mb-5 pl-4">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span class="font-semibold text-white text-sm">${esc(r.type)}</span>
            <span class="${typeCls} px-2 py-0.5 rounded-full text-xs">${fmtDate(r.date)}</span>
            ${r.cost ? `<span class="text-accent font-semibold text-xs">${r.cost.toLocaleString('ru-RU')} ₽</span>` : ''}
          </div>
          ${r.description ? `<p class="text-gray-400 text-sm">${esc(r.description)}</p>` : ''}
          ${photos ? `<div class="flex gap-2 mt-2 flex-wrap">${photos}</div>` : ''}
          ${rem ? `<div class="mt-2 text-xs ${rem.done ? 'text-gray-600 line-through' : 'text-yellow-400'}">
            🔔 ${esc(rem.text)} — ${fmtDate(rem.date)}
          </div>` : ''}
        </div>
        <button onclick="deleteRepair('${c.id}','${r.id}')" class="btn-danger text-xs py-1 px-2 shrink-0">
          <i data-lucide="trash-2" class="w-3 h-3"></i>
        </button>
      </div>
    </div>`;
  }).join('') : '<p class="text-gray-500 text-sm">История пуста</p>';

  return `
    <!-- Info + access -->
    <div class="grid sm:grid-cols-2 gap-4 mb-5">
      <div class="card p-4">
        <p class="label">Телефон</p>
        <a href="tel:${c.phone}" class="text-white font-semibold hover:text-accent">${esc(c.phone)}</a>
        <p class="label mt-3">Уровень</p>
        <p class="text-white font-semibold">${levelBadge(c.level)}</p>
      </div>
      <div class="card p-4">
        <p class="label">Код доступа к профилю</p>
        <p class="text-2xl font-black text-accent tracking-widest">${c.accessCode || '—'}</p>
        <p class="text-xs text-gray-500 mt-1">Сообщите клиенту для входа в профиль</p>
        <p class="label mt-3">Telegram</p>
        <p class="text-sm">${c.telegramChatId ? '✅ Привязан — коды приходят автоматически' : '⚠️ Не привязан — клиент должен написать боту /start'}</p>
      </div>
    </div>

    <!-- Cars -->
    <div class="mb-5">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-bold text-white text-sm">🚗 Автомобили</h4>
        <button onclick="promptAddCar('${c.id}')" class="btn-ghost text-xs py-1.5">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Добавить авто
        </button>
      </div>
      <div class="card p-3">${carsHtml}</div>
    </div>

    <!-- Add repair -->
    <div class="flex gap-2 mb-5">
      <button onclick="openRepairModal('${c.id}', null)" class="btn-primary">
        <i data-lucide="plus" class="w-4 h-4"></i> Добавить запись о ремонте
      </button>
    </div>

    <!-- Repair timeline -->
    <div>
      <h4 class="font-bold text-white text-sm mb-4">📋 История ремонтов (${(c.repairs||[]).length})</h4>
      <div class="pl-2">${repairsHtml}</div>
    </div>`;
}

window.promptAddCar = async (clientId) => {
  const brand = prompt('Марка:'); if (!brand) return;
  const model = prompt('Модель:'); if (!model) return;
  const year  = prompt('Год:');
  const plate = prompt('Гос.номер:');
  const res   = await api('POST', `/api/clients/${clientId}/cars`, { brand, model, year, plate });
  if (res.ok) { await openClientDetail(clientId); toast('Авто добавлено'); }
};

window.deleteCar = async (clientId, carId) => {
  if (!confirm('Удалить автомобиль?')) return;
  const res = await api('DELETE', `/api/clients/${clientId}/cars/${carId}`);
  if (res.ok) { await openClientDetail(clientId); toast('Удалено'); }
};

window.deleteRepair = async (clientId, repairId) => {
  if (!confirm('Удалить запись о ремонте?')) return;
  const res = await api('DELETE', `/api/clients/${clientId}/repairs/${repairId}`);
  if (res.ok) { await openClientDetail(clientId); await loadClients(); toast('Удалено'); }
};

/* ── Repair modal ── */
window.openRepairModal = async (clientId, prefill) => {
  document.getElementById('repair-client-id').value = clientId || '';
  document.getElementById('repair-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('form-repair').reset();
  document.getElementById('repair-date').value = new Date().toISOString().slice(0, 10);

  // Populate car dropdown
  const sel = document.getElementById('repair-car-select');
  sel.innerHTML = '<option value="">— Без привязки к авто —</option>';
  if (clientId) {
    const res = await api('GET', `/api/clients/${clientId}`);
    if (res.ok) {
      (res.client.cars || []).forEach(car => {
        sel.innerHTML += `<option value="${car.id}">${esc(car.brand)} ${esc(car.model)} ${car.year || ''}</option>`;
      });
    }
  }

  openModal('modal-repair');
};

function bindRepairForm() {
  document.getElementById('form-repair').addEventListener('submit', async e => {
    e.preventDefault();
    const clientId = document.getElementById('repair-client-id').value;
    if (!clientId) { toast('Выберите клиента', true); return; }
    const fd = new FormData(e.target);
    const res = await fetch(`/api/clients/${clientId}/repairs`, {
      method: 'POST',
      headers: { 'x-admin-password': TOKEN },
      body: fd,
    });
    const json = await res.json();
    if (json.ok) {
      closeModal('modal-repair');
      closeModal('modal-client-detail');
      e.target.reset();
      await loadClients();
      toast('✅ Запись добавлена. Клиент видит её в своём профиле.');
    }
  });
}

/* ══════════════════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════════════════ */
function renderAnalytics() {
  const a = ANALYTICS;
  document.getElementById('an-revenue').textContent  = (a.monthRevenue || 0).toLocaleString('ru-RU') + ' ₽';
  document.getElementById('an-avgcheck').textContent  = (a.avgCheck || 0).toLocaleString('ru-RU') + ' ₽';
  document.getElementById('an-visits').textContent   = a.monthVisits || 0;
  document.getElementById('an-total').textContent    = a.totalClients || 0;

  // Simple bar chart via Canvas
  renderBarChart(a.visitsByMonth || {});

  // Service frequency bars
  const freq    = a.serviceFreq || {};
  const maxFreq = Math.max(...Object.values(freq), 1);
  const freqEl  = document.getElementById('service-freq');
  freqEl.innerHTML = Object.entries(freq)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 6)
    .map(([type, count]) => `
      <div>
        <div class="flex justify-between text-xs text-gray-400 mb-1">
          <span>${esc(type)}</span><span>${count}</span>
        </div>
        <div class="bg-border rounded-full h-1.5">
          <div class="bg-accent rounded-full h-1.5" style="width:${Math.round(count/maxFreq*100)}%"></div>
        </div>
      </div>`).join('') || '<p class="text-gray-500 text-sm">Нет данных</p>';

  // Churn list
  const churnEl = document.getElementById('an-churn-list');
  const churn   = a.churnClients || [];
  churnEl.innerHTML = churn.length
    ? churn.map(c => `
        <div class="flex items-center justify-between py-2 border-b border-border last:border-0">
          <div>
            <span class="font-semibold text-white text-sm">${esc(c.name)}</span>
            ${c.lastRepairDate ? `<span class="text-gray-500 text-xs ml-2">последний визит: ${fmtDate(c.lastRepairDate)}</span>` : ''}
          </div>
          <a href="tel:${c.phone}" class="btn-ghost text-xs py-1.5">
            <i data-lucide="phone" class="w-3.5 h-3.5"></i> Позвонить
          </a>
        </div>`).join('')
    : '<p class="text-gray-500 text-sm">Нет клиентов в зоне оттока 👍</p>';
  lucide.createIcons();
}

function renderBarChart(visitsByMonth) {
  const canvas = document.getElementById('chart-visits');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const labels = Object.keys(visitsByMonth);
  const values = Object.values(visitsByMonth);
  const max    = Math.max(...values, 1);
  const W      = canvas.clientWidth || 400;
  const H      = 160;
  canvas.width  = W;
  canvas.height = H;

  const pad   = 30;
  const barW  = (W - pad * 2) / labels.length;
  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + (H - pad * 2) * (1 - i / 4);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
  }

  labels.forEach((label, i) => {
    const val  = values[i];
    const barH = ((H - pad * 2) * val) / max;
    const x    = pad + i * barW;
    const y    = H - pad - barH;

    // Bar
    const grad = ctx.createLinearGradient(0, y, 0, H - pad);
    grad.addColorStop(0, '#00b4fd');
    grad.addColorStop(1, 'rgba(0,180,253,0.2)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x + barW * 0.15, y, barW * 0.7, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle   = '#7d8590';
    ctx.font        = '10px Inter, sans-serif';
    ctx.textAlign   = 'center';
    const shortLabel = label.slice(5); // MM
    ctx.fillText(shortLabel, x + barW / 2, H - 10);
  });
}

/* ══════════════════════════════════════════════════════════
   CONTACTS & SETTINGS POPULATE
══════════════════════════════════════════════════════════ */
function populateContacts() {
  const form = document.getElementById('form-contacts');
  const c    = DATA.contacts || {};
  Object.keys(c).forEach(k => { const el = form.elements[k]; if (el) el.value = c[k]; });
}

function populateSettings() {
  const form = document.getElementById('form-settings');
  const s    = DATA.settings || {};
  if (form.elements.heroTitle)    form.elements.heroTitle.value    = s.heroTitle    || '';
  if (form.elements.heroSubtitle) form.elements.heroSubtitle.value = s.heroSubtitle || '';
  if (form.elements.masterName)   form.elements.masterName.value   = s.masterName   || '';
  document.getElementById('cb-accepting').checked = s.acceptingRequests !== false;
}

/* ══════════════════════════════════════════════════════════
   SERVICES (with drag-and-drop + active toggle)
══════════════════════════════════════════════════════════ */
function renderServicesAdmin() {
  const list = document.getElementById('services-admin-list');
  list.innerHTML = (DATA.services || []).map((s, idx) => `
    <div class="card p-4 flex items-start gap-4 cursor-grab select-none ${s.active === false ? 'opacity-50' : ''}"
         draggable="true" data-idx="${idx}" data-id="${s.id}"
         ondragstart="onDragStart(event)" ondragover="onDragOver(event)" ondrop="onDrop(event)">
      <div class="text-gray-600 shrink-0 mt-1"><i data-lucide="grip-vertical" class="w-4 h-4"></i></div>
      <div class="shrink-0 w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
        <i data-lucide="${s.icon}" class="w-5 h-5 text-accent"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-white text-sm">${esc(s.title)}</p>
        <p class="text-gray-400 text-xs mt-0.5 line-clamp-2">${esc(s.description)}</p>
        <p class="text-accent font-semibold text-xs mt-1">${esc(s.price)}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button onclick="toggleService('${s.id}')" title="${s.active === false ? 'Включить' : 'Скрыть'}"
                class="btn-ghost text-xs py-1.5 px-2.5">
          <i data-lucide="${s.active === false ? 'eye-off' : 'eye'}" class="w-3.5 h-3.5"></i>
        </button>
        <button onclick="openServiceModal('${s.id}')" class="btn-ghost text-xs py-1.5 px-2.5">
          <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
        </button>
        <button onclick="deleteService('${s.id}')" class="btn-danger text-xs py-1.5 px-2.5">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    </div>`).join('') || '<p class="text-gray-500 text-sm">Нет услуг.</p>';
  lucide.createIcons();
}

// Drag-and-drop for services
window.onDragStart = (e) => { dragSrcIndex = +e.currentTarget.dataset.idx; e.dataTransfer.effectAllowed = 'move'; };
window.onDragOver  = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
window.onDrop      = async (e) => {
  e.preventDefault();
  const destIndex = +e.currentTarget.dataset.idx;
  if (dragSrcIndex === destIndex) return;
  const services = [...DATA.services];
  const [moved]  = services.splice(dragSrcIndex, 1);
  services.splice(destIndex, 0, moved);
  DATA.services = services;
  renderServicesAdmin();
  const ids = services.map(s => s.id);
  await api('PUT', '/api/services/reorder', { ids });
  toast('Порядок сохранён');
};

window.toggleService = async (id) => {
  const s = DATA.services.find(s => s.id === id);
  if (!s) return;
  s.active = s.active === false ? true : false;
  const res = await api('POST', '/api/services', s);
  if (res.ok) { DATA.services = res.services; renderServicesAdmin(); }
};

function bindServiceForm() {
  document.getElementById('form-service').addEventListener('submit', async e => {
    e.preventDefault();
    const body = formToObj(e.target);
    body.active = document.getElementById('svc-active').checked;
    const res  = await api('POST', '/api/services', body);
    if (res.ok) { DATA.services = res.services; renderServicesAdmin(); closeModal('modal-service'); toast(); }
  });
}

window.openServiceModal = (id) => {
  const form  = document.getElementById('form-service');
  const title = document.getElementById('modal-service-title');
  form.reset();
  document.getElementById('svc-active').checked = true;
  if (id) {
    const s = DATA.services.find(s => s.id === id);
    if (s) {
      form.elements.id.value          = s.id;
      form.elements.title.value       = s.title;
      form.elements.description.value = s.description;
      form.elements.price.value       = s.price;
      form.elements.icon.value        = s.icon;
      document.getElementById('svc-active').checked = s.active !== false;
      title.textContent = 'Редактировать услугу';
      updateIconPreview(s.icon);
    }
  } else {
    form.elements.id.value = '';
    title.textContent = 'Новая услуга';
  }
  openModal('modal-service');
};

window.deleteService = async (id) => {
  if (!confirm('Удалить услугу?')) return;
  const res = await api('DELETE', `/api/services/${id}`);
  if (res.ok) { DATA.services = res.services; renderServicesAdmin(); toast('Удалено'); }
};

function bindIconPreview() {
  document.getElementById('icon-input')?.addEventListener('input', e => updateIconPreview(e.target.value));
}

function updateIconPreview(name) {
  const el = document.getElementById('icon-preview-el');
  if (!el) return;
  el.setAttribute('data-lucide', name || 'help-circle');
  lucide.createIcons();
}

/* ══════════════════════════════════════════════════════════
   REVIEWS (with edit)
══════════════════════════════════════════════════════════ */
function renderReviewsAdmin() {
  const grid = document.getElementById('reviews-admin-grid');
  grid.innerHTML = (DATA.reviews || []).map(r => `
    <div class="card overflow-hidden">
      <img src="${esc(r.image)}" alt="${esc(r.name)}"
           class="w-full h-40 object-cover cursor-pointer hover:opacity-80 transition-opacity"
           onclick="window.open('${esc(r.image)}','_blank')" />
      <div class="p-4">
        <p class="font-bold text-white text-sm mb-1">${esc(r.name)}</p>
        <p class="text-gray-400 text-xs line-clamp-2">${esc(r.text)}</p>
        <div class="flex gap-2 mt-3">
          <button onclick="openReviewModal('${r.id}')" class="btn-ghost text-xs py-1.5 flex-1">
            <i data-lucide="pencil" class="w-3 h-3"></i> Ред.
          </button>
          <button onclick="deleteReview('${r.id}')" class="btn-danger text-xs py-1.5 flex-1">
            <i data-lucide="trash-2" class="w-3 h-3"></i> Удалить
          </button>
        </div>
      </div>
    </div>`).join('') || '<p class="text-gray-500 text-sm col-span-3">Нет отзывов.</p>';
  lucide.createIcons();
}

function bindReviewForm() {
  document.getElementById('form-review').addEventListener('submit', async e => {
    e.preventDefault();
    const reviewId = e.target.elements.reviewId.value;
    if (reviewId) {
      // Edit existing (text/name only, no re-upload)
      const body = { name: e.target.elements.name.value, text: e.target.elements.text.value };
      const res  = await api('PUT', `/api/reviews/${reviewId}`, body);
      if (res.ok) {
        const idx = DATA.reviews.findIndex(r => r.id === reviewId);
        if (idx !== -1) DATA.reviews[idx] = res.review;
        renderReviewsAdmin(); closeModal('modal-review'); toast();
      }
    } else {
      const fd  = new FormData(e.target);
      const res = await fetch('/api/reviews', {
        method: 'POST', headers: { 'x-admin-password': TOKEN }, body: fd,
      });
      const json = await res.json();
      if (json.ok) { DATA.reviews.push(json.review); renderReviewsAdmin(); closeModal('modal-review'); toast(); e.target.reset(); }
    }
  });
}

window.openReviewModal = (id) => {
  const form  = document.getElementById('form-review');
  const title = document.getElementById('modal-review-title');
  const imgSec = document.getElementById('review-image-section');
  form.reset();
  form.elements.reviewId.value = '';
  imgSec.classList.remove('hidden');
  title.textContent = 'Новый отзыв';
  if (id) {
    const r = DATA.reviews.find(r => r.id === id);
    if (r) {
      form.elements.reviewId.value = r.id;
      form.elements.name.value     = r.name;
      form.elements.text.value     = r.text;
      title.textContent = 'Редактировать отзыв';
      imgSec.classList.add('hidden'); // don't show file upload on edit
    }
  }
  openModal('modal-review');
};

window.deleteReview = async (id) => {
  if (!confirm('Удалить отзыв и фото?')) return;
  const res = await fetch(`/api/reviews/${id}`, { method:'DELETE', headers:{'x-admin-password':TOKEN} });
  const json = await res.json();
  if (json.ok) { DATA.reviews = DATA.reviews.filter(r => r.id !== id); renderReviewsAdmin(); toast('Удалено'); }
};

/* ══════════════════════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════════════════════ */
window.closeModal = (id) => {
  const el = document.getElementById(id);
  el.classList.add('hidden'); el.classList.remove('flex');
};
function openModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden'); el.classList.add('flex');
}

/* ══════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════ */
async function api(method, url, body) {
  const opts = { method, headers: { 'x-admin-password': TOKEN } };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(url, opts);
  return res.json();
}

function formToObj(form) { return Object.fromEntries(new FormData(form)); }

function toast(msg = 'Сохранено', isError = false) {
  const el = document.getElementById('toast');
  el.textContent = (isError ? '❌ ' : '✅ ') + msg;
  el.className = `fixed top-4 right-4 z-50 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-transform duration-300 ${isError ? 'bg-red-600' : 'bg-green-600'}`;
  el.classList.remove('translate-x-[150%]');
  setTimeout(() => el.classList.add('translate-x-[150%]'), 3000);
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(str) {
  if (!str) return '—';
  try { return new Date(str).toLocaleDateString('ru-RU', { day:'numeric', month:'short', year:'numeric' }); }
  catch { return str; }
}

function fmtDateTime(str) {
  if (!str) return '—';
  try { return new Date(str).toLocaleString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); }
  catch { return str; }
}

function statusLabel(s) {
  return { new:'Новая', work:'В работе', done:'Выполнена', cancel:'Отменена' }[s] || s;
}

function levelBadge(level) {
  return { newcomer:'🔩 Новичок', regular:'⚡ Постоянный', veteran:'🏆 Ветеран' }[level] || level;
}

function typeColor(type) {
  const map = {
    'Диагностика': 'bg-accent/10 text-accent',
    'Ремонт проводки': 'bg-orange-500/10 text-orange-400',
    'Сигнализация': 'bg-purple-500/10 text-purple-400',
    'Стартер / Генератор': 'bg-yellow-500/10 text-yellow-400',
    'Напоминание': 'bg-gray-500/10 text-gray-400',
  };
  return map[type] || 'bg-green-500/10 text-green-400';
}

function pluralRu(n) {
  if (n % 10 === 1 && n % 100 !== 11) return '';
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'а';
  return 'ов';
}
