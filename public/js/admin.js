/* ============================================================
   admin.js — AutoElectro Admin Panel
============================================================ */

'use strict';

/* ── State ── */
let TOKEN = localStorage.getItem('ae_admin_token') || '';
let DATA  = {};

/* ── Init ── */
lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
  if (TOKEN) {
    loadAndShow();
  }
  bindEvents();
});

/* ══════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════ */
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const pwd = document.getElementById('login-pwd').value;
  const err = document.getElementById('login-err');
  err.classList.add('hidden');

  try {
    const res  = await fetch('/api/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: pwd }),
    });
    const json = await res.json();
    if (json.ok) {
      TOKEN = pwd;
      localStorage.setItem('ae_admin_token', TOKEN);
      loadAndShow();
    } else {
      err.classList.remove('hidden');
    }
  } catch {
    err.textContent = 'Ошибка соединения';
    err.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  TOKEN = '';
  localStorage.removeItem('ae_admin_token');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('flex');
  document.getElementById('login-screen').classList.remove('hidden');
});

/* ══════════════════════════════════════════════════════════
   LOAD DATA & SHOW DASHBOARD
══════════════════════════════════════════════════════════ */
async function loadAndShow() {
  const res = await fetch('/api/data');
  DATA = await res.json();

  document.getElementById('login-screen').classList.add('hidden');
  const dash = document.getElementById('dashboard');
  dash.classList.remove('hidden');
  dash.classList.add('flex', 'flex-col');

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
  /* Tab switching */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.classList.add('text-gray-400', 'hover:bg-surface');
      });
      btn.classList.add('active');
      btn.classList.remove('text-gray-400', 'hover:bg-surface');

      document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });

  /* Add service button */
  document.getElementById('btn-add-service').addEventListener('click', () => {
    openServiceModal(null);
  });

  /* Add review button */
  document.getElementById('btn-add-review').addEventListener('click', () => {
    openModal('modal-review');
    document.getElementById('form-review').reset();
  });

  /* Form: contacts */
  document.getElementById('form-contacts').addEventListener('submit', async e => {
    e.preventDefault();
    const body = formToObj(e.target);
    const res  = await api('PUT', '/api/contacts', body);
    if (res.ok) { DATA.contacts = res.contacts; toast(); }
  });

  /* Form: settings */
  document.getElementById('form-settings').addEventListener('submit', async e => {
    e.preventDefault();
    const { newPassword, ...rest } = formToObj(e.target);
    const body = { ...rest };
    if (newPassword) { body.password = newPassword; TOKEN = newPassword; localStorage.setItem('ae_admin_token', TOKEN); }
    const res = await api('PUT', '/api/settings', body);
    if (res.ok) toast();
  });

  /* Form: service */
  document.getElementById('form-service').addEventListener('submit', async e => {
    e.preventDefault();
    const body = formToObj(e.target);
    const res  = await api('POST', '/api/services', body);
    if (res.ok) {
      DATA.services = res.services;
      renderServicesAdmin();
      closeModal('modal-service');
      toast();
    }
  });

  /* Form: review */
  document.getElementById('form-review').addEventListener('submit', async e => {
    e.preventDefault();
    const fd  = new FormData(e.target);
    const res = await fetch('/api/reviews', {
      method:  'POST',
      headers: { 'x-admin-password': TOKEN },
      body:    fd,
    });
    const json = await res.json();
    if (json.ok) {
      DATA.reviews.push(json.review);
      renderReviewsAdmin();
      closeModal('modal-review');
      toast();
      e.target.reset();
    }
  });
}

/* ══════════════════════════════════════════════════════════
   POPULATE FORMS
══════════════════════════════════════════════════════════ */
function populateContacts() {
  const form = document.getElementById('form-contacts');
  const c    = DATA.contacts || {};
  Object.keys(c).forEach(k => {
    const el = form.elements[k];
    if (el) el.value = c[k];
  });
}

function populateSettings() {
  const form = document.getElementById('form-settings');
  const s    = DATA.settings || {};
  if (form.elements.heroTitle)    form.elements.heroTitle.value    = s.heroTitle    || '';
  if (form.elements.heroSubtitle) form.elements.heroSubtitle.value = s.heroSubtitle || '';
}

/* ══════════════════════════════════════════════════════════
   RENDER SERVICES (admin)
══════════════════════════════════════════════════════════ */
function renderServicesAdmin() {
  const list = document.getElementById('services-admin-list');
  list.innerHTML = (DATA.services || []).map(s => `
    <div class="flex items-start gap-4 bg-bg border border-border
                rounded-2xl p-5">
      <div class="shrink-0 w-11 h-11 rounded-xl bg-accent/10
                  flex items-center justify-center">
        <i data-lucide="${s.icon}" class="w-5 h-5 text-accent"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-white">${s.title}</p>
        <p class="text-gray-400 text-sm mt-0.5 line-clamp-2">${s.description}</p>
        <p class="text-accent font-semibold text-sm mt-1">${s.price}</p>
      </div>
      <div class="flex gap-2 shrink-0">
        <button onclick="openServiceModal('${s.id}')"
                class="p-2 rounded-xl border border-border text-gray-400
                       hover:text-white hover:border-accent transition-colors">
          <i data-lucide="pencil" class="w-4 h-4"></i>
        </button>
        <button onclick="deleteService('${s.id}')"
                class="p-2 rounded-xl border border-border text-gray-400
                       hover:text-red-400 hover:border-red-400 transition-colors">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('') || '<p class="text-gray-500 text-sm">Нет услуг.</p>';
  lucide.createIcons();
}

/* ══════════════════════════════════════════════════════════
   RENDER REVIEWS (admin)
══════════════════════════════════════════════════════════ */
function renderReviewsAdmin() {
  const grid = document.getElementById('reviews-admin-grid');
  grid.innerHTML = (DATA.reviews || []).map(r => `
    <div class="bg-bg border border-border rounded-2xl overflow-hidden">
      <img src="${r.image}" alt="${r.name}"
           class="w-full h-44 object-cover" />
      <div class="p-4">
        <p class="font-bold text-white text-sm mb-1">${r.name}</p>
        <p class="text-gray-400 text-xs line-clamp-2">${r.text}</p>
        <button onclick="deleteReview('${r.id}')"
                class="mt-3 flex items-center gap-1.5 text-xs text-red-400
                       hover:text-red-300 transition-colors">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          Удалить отзыв
        </button>
      </div>
    </div>
  `).join('') || '<p class="text-gray-500 text-sm col-span-3">Нет отзывов.</p>';
  lucide.createIcons();
}

/* ══════════════════════════════════════════════════════════
   MODALS
══════════════════════════════════════════════════════════ */
window.openServiceModal = (id) => {
  const form  = document.getElementById('form-service');
  const title = document.getElementById('modal-service-title');
  form.reset();

  if (id) {
    const s = DATA.services.find(s => s.id === id);
    if (s) {
      form.elements.id.value          = s.id;
      form.elements.title.value       = s.title;
      form.elements.description.value = s.description;
      form.elements.price.value       = s.price;
      form.elements.icon.value        = s.icon;
      title.textContent = 'Редактировать услугу';
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

window.deleteReview = async (id) => {
  if (!confirm('Удалить отзыв и фото?')) return;
  const res = await fetch(`/api/reviews/${id}`, {
    method:  'DELETE',
    headers: { 'x-admin-password': TOKEN },
  });
  const json = await res.json();
  if (json.ok) {
    DATA.reviews = DATA.reviews.filter(r => r.id !== id);
    renderReviewsAdmin();
    toast('Удалено');
  }
};

window.closeModal = (id) => {
  document.getElementById(id).classList.add('hidden');
  document.getElementById(id).classList.remove('flex');
};

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.getElementById(id).classList.add('flex');
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'x-admin-password': TOKEN },
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res  = await fetch(url, opts);
  return res.json();
}

function formToObj(form) {
  return Object.fromEntries(new FormData(form));
}

function toast(msg = 'Сохранено') {
  const el = document.getElementById('toast');
  el.textContent = '✅ ' + msg;
  el.classList.remove('translate-x-[150%]');
  setTimeout(() => el.classList.add('translate-x-[150%]'), 2500);
}
