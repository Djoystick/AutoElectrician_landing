/* ============================================================
   main.js — AutoElectro
   Загрузка данных → рендер всех секций → GSAP анимации
============================================================ */


/* ── State ── */
let DATA = {};

/* ══════════════════════════════════════════════════════════
   REQUEST MODAL & FORM (Instant global handlers)
══════════════════════════════════════════════════════════ */
window.openRequestModal = function(prefillProblem) {
  const modalReq = document.getElementById('modal-request');
  if (!modalReq) return;
  const formPubReq = document.getElementById('form-public-request');
  if (prefillProblem && formPubReq) {
    const p = formPubReq.querySelector('[name="problem"]');
    if (p) p.value = prefillProblem;
  }
  const fieldsGroup = document.getElementById('req-fields-group');
  if (fieldsGroup) fieldsGroup.classList.remove('hidden');
  modalReq.style.display = 'flex';
  modalReq.classList.remove('hidden');
  modalReq.classList.add('flex');
  const reqSuccess = document.getElementById('req-success');
  const reqError = document.getElementById('req-error');
  if (reqSuccess) reqSuccess.classList.add('hidden');
  if (reqError) reqError.classList.add('hidden');
};

window.closeRequestModal = function() {
  const modalReq = document.getElementById('modal-request');
  if (!modalReq) return;
  modalReq.style.display = 'none';
  modalReq.classList.add('hidden');
  modalReq.classList.remove('flex');
};

// Global click & touch delegation for opening and closing request modal
document.addEventListener('click', function(e) {
  const openBtn = e.target.closest('#hero-request-btn, #sticky-request-btn, [data-open-request]');
  if (openBtn) {
    e.preventDefault();
    window.openRequestModal();
    return;
  }
  const closeBtn = e.target.closest('#close-request-modal');
  if (closeBtn) {
    e.preventDefault();
    window.closeRequestModal();
    return;
  }
  const modalReq = document.getElementById('modal-request');
  if (modalReq && e.target === modalReq) {
    window.closeRequestModal();
  }
});

// Global form submission handler
document.addEventListener('submit', async function(e) {
  const formPubReq = e.target.closest('#form-public-request');
  if (!formPubReq) return;
  e.preventDefault();

  const submitBtn = formPubReq.querySelector('button[type="submit"]');
  const reqSuccess = document.getElementById('req-success');
  const reqError = document.getElementById('req-error');
  if (submitBtn) submitBtn.disabled = true;
  if (reqSuccess) reqSuccess.classList.add('hidden');
  if (reqError) reqError.classList.add('hidden');

  const formData = new FormData(formPubReq);
  const payload = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      if (json.token) {
        localStorage.setItem('ae_client_token', json.token);
      }
      if (reqSuccess) {
        reqSuccess.classList.remove('hidden');
        const openProfBtn = document.getElementById('btn-req-open-profile');
        if (openProfBtn && json.token) {
          openProfBtn.href = `/profile.html?auth=${json.token}`;
        }
      }
      formPubReq.reset();
      const fieldsGroup = document.getElementById('req-fields-group');
      if (fieldsGroup) fieldsGroup.classList.add('hidden');
      if (typeof window.onMascotCelebration === 'function') {
        window.onMascotCelebration();
      }
    } else {
      if (reqError) {
        reqError.textContent = json.error || 'Ошибка при отправке заявки. Позвоните нам напрямую.';
        reqError.classList.remove('hidden');
      }
    }
  } catch (err) {
    if (reqError) {
      reqError.textContent = 'Ошибка соединения. Пожалуйста, позвоните мастеру.';
      reqError.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
async function init() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('API error');
    DATA = await res.json();
  } catch (e) {
    console.error('Ошибка загрузки данных:', e);
    DATA = { settings: {}, contacts: {}, services: [], reviews: [] };
  }

  try { renderHero(); } catch (e) { console.warn('renderHero error:', e); }
  try { renderServices(); } catch (e) { console.warn('renderServices error:', e); }
  try { renderReviews(); } catch (e) { console.warn('renderReviews error:', e); }
  try { renderContacts(); } catch (e) { console.warn('renderContacts error:', e); }

  try {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (e) { console.warn('lucide error:', e); }

  try {
    const yr = document.getElementById('footer-year');
    if (yr) yr.textContent = new Date().getFullYear();
  } catch (e) {}

  try { initNavbar(); } catch (e) { console.warn('initNavbar error:', e); }
  try { initAnimations(); } catch (e) { console.warn('initAnimations error:', e); }
  try { initLightbox(); } catch (e) { console.warn('initLightbox error:', e); }
  try { initCalculator(); } catch (e) { console.warn('initCalculator error:', e); }
}

/* ══════════════════════════════════════════════════════════
   RENDER FUNCTIONS
══════════════════════════════════════════════════════════ */

function renderHero() {
  const s = DATA.settings || {};
  const c = DATA.contacts  || {};

  // Title — wrap last word in accent colour with gradient
  const titleEl = document.getElementById('hero-title');
  if (s.heroTitle) {
    const words = s.heroTitle.trim().split(' ');
    const last  = words.pop();
    titleEl.innerHTML =
      words.join(' ') + (words.length ? ' ' : '') +
      `<span class="text-accent">${last}</span>`;
  }

  const subtitleEl = document.getElementById('hero-subtitle');
  if (s.heroSubtitle) subtitleEl.textContent = s.heroSubtitle;

  // Accepting requests badge (Living Status Indicator)
  const badge        = document.getElementById('hero-badge');
  const acceptingText = document.getElementById('hero-accepting-text');
  if (badge && acceptingText) {
    const accepting = s.acceptingRequests !== false;
    if (!accepting) {
      badge.classList.remove('free');
      badge.classList.add('busy');
      acceptingText.textContent = '🟡 На выезде / Занят';
    } else {
      badge.classList.remove('busy');
      badge.classList.add('free');
      acceptingText.textContent = '🟢 Свободен — выезд за ~25 мин';
    }
  }

  // Phone links
  const phone     = c.phone || '+7 (999) 123-45-67';
  const phoneHref = 'tel:' + phone.replace(/[^\d+]/g, '');
  setHref('sticky-call-btn',   phoneHref);
  setHref('nav-call-btn',      phoneHref);
  setHref('hero-call-btn',     phoneHref);
  setHref('services-call-btn', phoneHref);
  setHref('calc-call-btn',     phoneHref);

  // City
  const cityEl = document.getElementById('hero-city');
  if (cityEl && c.city) cityEl.textContent = 'Выезд ' + c.city;

  // Dynamic price in bubble
  const priceBubble = document.getElementById('hero-bubble-price');
  if (priceBubble && DATA.services && DATA.services.length > 0) {
    priceBubble.textContent = DATA.services[0].price || '0 ₽';
  }
}


let currentServiceCategory = 'all';
let currentServiceSearch = '';

function mapServiceCategoryKey(service) {
  const title = (service.title || '').toLowerCase();
  if (title.includes('диагностик') || title.includes('осциллограф') || title.includes('ошибок') || title.includes('эбу')) return 'diagnostics';
  if (title.includes('акб') || title.includes('генератор') || title.includes('стартер') || title.includes('разряд') || title.includes('утечк') || title.includes('подогрев') || title.includes('техпомощь')) return 'start-battery';
  if (title.includes('проводк') || title.includes('кос') || title.includes('разъем') || title.includes('блок') || title.includes('кз') || title.includes('обрыв') || title.includes('зажиган') || title.includes('бензонасос') || title.includes('датчик')) return 'wiring-blocks';
  if (title.includes('сигнализац') || title.includes('иммо') || title.includes('секретк') || title.includes('брелок') || title.includes('метк')) return 'security-immobilizer';
  return 'equipment-light';
}

function renderServiceFilters() {
  const filterWrap = document.getElementById('service-filters');
  if (!filterWrap || !DATA.services?.length) return;

  const total = DATA.services.length;
  const diagCount = DATA.services.filter(s => mapServiceCategoryKey(s) === 'diagnostics').length;
  const startCount = DATA.services.filter(s => mapServiceCategoryKey(s) === 'start-battery').length;
  const wireCount = DATA.services.filter(s => mapServiceCategoryKey(s) === 'wiring-blocks').length;
  const secCount = DATA.services.filter(s => mapServiceCategoryKey(s) === 'security-immobilizer').length;
  const equipCount = DATA.services.filter(s => mapServiceCategoryKey(s) === 'equipment-light').length;

  const categories = [
    { name: `Все (${total})`, key: 'all' },
    { name: `Диагностика (${diagCount})`, key: 'diagnostics' },
    { name: `Пуск & АКБ (${startCount})`, key: 'start-battery' },
    { name: `Проводка & Блоки (${wireCount})`, key: 'wiring-blocks' },
    { name: `Сигнализации & Иммо (${secCount})`, key: 'security-immobilizer' },
    { name: `Свет & Комфорт (${equipCount})`, key: 'equipment-light' }
  ];

  filterWrap.innerHTML = categories.map(cat => `
    <button type="button" class="filter-chip ${cat.key === currentServiceCategory ? 'active' : ''}" data-key="${cat.key}">
      ${cat.name}
    </button>
  `).join('');

  filterWrap.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentServiceCategory = chip.getAttribute('data-key') || 'all';
      filterWrap.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
      renderServicesList();
    });
  });
}

function renderServicesList() {
  const grid = document.getElementById('services-grid');
  if (!grid || !DATA.services?.length) return;

  const q = (currentServiceSearch || '').trim().toLowerCase();

  const filtered = DATA.services.filter(s => {
    const matchesCategory = (currentServiceCategory === 'all') || (mapServiceCategoryKey(s) === currentServiceCategory);
    const matchesSearch = !q || (s.title && s.title.toLowerCase().includes(q)) || (s.description && s.description.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-gray-400">
        <i data-lucide="search-x" class="w-10 h-10 mx-auto mb-3 text-accent/50"></i>
        <p class="text-base font-semibold text-white">Услуги по запросу «${currentServiceSearch}» не найдены</p>
        <p class="text-xs text-gray-500 mt-1">Попробуйте изменить запрос или выберите категорию «Все»</p>
      </div>
    `;
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      lucide.createIcons();
    }
    return;
  }

  grid.innerHTML = filtered.map(s => `
    <div class="bento-card group" data-title="${s.title}">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
          <i data-lucide="${s.icon || 'wrench'}" class="w-5 h-5 text-accent"></i>
        </div>
        <span class="inline-block bg-[#ffb800]/15 text-[#ffb800] border border-[#ffb800]/30 font-bold text-xs px-3 py-1 rounded-full shrink-0">
          ${s.price || 'по запросу'}
        </span>
      </div>

      <h3 class="font-bold text-white text-base leading-snug mb-1.5 group-hover:text-accent transition-colors">
        ${s.title}
      </h3>

      <div class="flex items-center justify-between text-xs text-gray-400 mt-3 pt-2 border-t border-white/5">
        <span class="inline-flex items-center gap-1 text-[11px] text-accent/90">
          <i data-lucide="chevron-down" class="w-3.5 h-3.5 transition-transform duration-200 bento-arrow"></i>
          Подробнее
        </span>
        <span class="text-[11px] text-gray-500">Гарантия 12 мес</span>
      </div>

      <div class="bento-details">
        <p class="text-xs text-gray-300 leading-relaxed pt-2">
          ${s.description || 'Выездная диагностика и устранение неисправности на месте.'}
        </p>
        <button type="button"
                class="w-full mt-3 py-2.5 px-4 rounded-xl bg-accent hover:brightness-110 text-bg font-bold text-xs transition-all flex items-center justify-center gap-1.5 order-service-btn cursor-pointer">
          <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
          Заказать эту услугу
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    lucide.createIcons();
  }

  // Accordion click & Order button handler
  grid.querySelectorAll('.bento-card').forEach(card => {
    const orderBtn = card.querySelector('.order-service-btn');
    const arrow = card.querySelector('.bento-arrow');

    card.addEventListener('click', (e) => {
      if (orderBtn && (e.target === orderBtn || orderBtn.contains(e.target))) return;
      card.classList.toggle('open');
      if (arrow) {
        arrow.style.transform = card.classList.contains('open') ? 'rotate(180deg)' : 'none';
      }
    });

    if (orderBtn) {
      orderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const serviceTitle = card.getAttribute('data-title') || 'Услуга автоэлектрика';
        if (typeof window.openRequestModal === 'function') {
          window.openRequestModal(`Заказ услуги: ${serviceTitle}`);
        }
      });
    }
  });
}

function renderServices() {
  renderServiceFilters();
  renderServicesList();

  const searchInput = document.getElementById('service-search');
  if (searchInput && !searchInput.dataset.initialized) {
    searchInput.dataset.initialized = 'true';
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentServiceSearch = e.target.value;
        renderServicesList();
      }, 200);
    });
  }
}

function renderReviews() {
  const wrapper = document.getElementById('reviews-wrapper');
  if (!wrapper || !DATA.reviews?.length) return;

  wrapper.innerHTML = DATA.reviews.map(r => `
    <div class="swiper-slide h-auto">
      <div class="h-full bg-surface border border-border rounded-3xl
                  p-5 flex flex-col">
        <div class="flex items-center gap-1 text-accent mb-4">
          ${[...Array(5)].map(() =>
            '<i data-lucide="star" class="w-4 h-4 fill-current"></i>'
          ).join('')}
        </div>
        <p class="text-gray-300 text-sm leading-relaxed italic grow mb-6">
          "${r.text}"
        </p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-accent/30
                      cursor-pointer hover:scale-105 transition-transform shrink-0"
               onclick="openLightbox('${r.image}')">
            <img src="${r.image}" alt="${r.name}"
                 class="w-full h-full object-cover" loading="lazy" />
          </div>
          <span class="font-semibold text-white text-sm">${r.name}</span>
        </div>
      </div>
    </div>
  `).join('');

  if (typeof Swiper !== 'undefined') {
    try {
      new Swiper('.reviews-swiper', {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: DATA.reviews.length > 2,
        autoplay: { delay: 5000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        breakpoints: {
          640:  { slidesPerView: 1.2 },
          768:  { slidesPerView: 2   },
          1024: { slidesPerView: 3   },
        },
      });
    } catch (e) {
      console.warn('Swiper init error:', e);
    }
  }
}

function renderContacts() {
  const c = DATA.contacts || {};

  const phone    = c.phone || '+7 (999) 123-45-67';
  const phoneHref = 'tel:' + phone.replace(/[^\d+]/g, '');

  const phoneEl = document.getElementById('contact-phone');
  if (phoneEl) { phoneEl.textContent = phone; phoneEl.href = phoneHref; }

  const hoursEl = document.getElementById('contact-hours');
  if (hoursEl && c.workingHours) hoursEl.textContent = c.workingHours;

  const cityEl = document.getElementById('contact-city');
  if (cityEl && c.city) cityEl.textContent = 'По ' + c.city;

  setHref('contact-wa', c.whatsapp || '#');
  setHref('contact-tg', c.telegram || '#');
  setHref('contact-vk', c.vk       || '#');
}

/* ══════════════════════════════════════════════════════════
   NAVBAR — glass effect on scroll
══════════════════════════════════════════════════════════ */
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      nav.classList.add('glass', 'py-2');
      nav.classList.remove('py-3');
    } else {
      nav.classList.remove('glass', 'py-2');
      nav.classList.add('py-3');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile Menu Toggle */
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    const toggleMenu = () => {
      const isHidden = mobileMenu.classList.contains('hidden');
      if (isHidden) {
        mobileMenu.classList.remove('hidden');
        void mobileMenu.offsetWidth; // trigger reflow
        mobileMenu.classList.remove('opacity-0');
        menuBtn.innerHTML = '<i data-lucide="x" class="w-5 h-5"></i>';
        lucide.createIcons();
      } else {
        mobileMenu.classList.add('opacity-0');
        setTimeout(() => {
          mobileMenu.classList.add('hidden');
          menuBtn.innerHTML = '<i data-lucide="menu" class="w-5 h-5"></i>';
          lucide.createIcons();
        }, 300);
      }
    };
    menuBtn.addEventListener('click', toggleMenu);
    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        if (!mobileMenu.classList.contains('hidden')) toggleMenu();
      });
    });
  }
}

/* ══════════════════════════════════════════════════════════
   GSAP ANIMATIONS
══════════════════════════════════════════════════════════ */
function initAnimations() {
  // Guard: animations are progressive enhancement only
  if (typeof gsap === 'undefined') return;

  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch(e) {
    console.warn('GSAP/ScrollTrigger not available, skipping animations');
    return;
  }

  /* — Hero — */
  const heroTl = gsap.timeline({ delay: 0.15 });
  heroTl
    .from('#hero-badge',    { y: 20, opacity: 0, duration: 0.5 })
    .from('#hero-title',    { y: 40, opacity: 0, duration: 0.6, ease: 'power3.out', clearProps: 'all' }, '-=0.2')
    .from('#hero-subtitle', { y: 30, opacity: 0, duration: 0.5, ease: 'power2.out', clearProps: 'all' }, '-=0.3')
    .from('#hero-btns > *', { y: 20, opacity: 0, duration: 0.4, stagger: 0.12, ease: 'power2.out', clearProps: 'all' }, '-=0.25')
    .from('#hero .flex.flex-wrap > *', {
      opacity: 0, x: -10, duration: 0.3, stagger: 0.1, clearProps: 'all'
    }, '-=0.2');

  /* — Generic .reveal elements (ScrollTrigger) — */
  gsap.utils.toArray('.reveal').forEach(el => {
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start:   'top 100%',
        toggleActions: 'play none none none',
        once:    true,
      },
      y:        35,
      opacity:  0,
      duration: 0.65,
      ease:     'power3.out',
      clearProps: 'all',
    });
  });

  /* — How-it-works cards — stagger — */
  gsap.from('.how-card', {
    scrollTrigger: { trigger: '#how', start: 'top 100%', toggleActions: 'play none none none', once: true },
    y:        50,
    opacity:  0,
    duration: 0.55,
    stagger:  0.18,
    ease:     'power3.out',
    clearProps: 'all',
  });

  /* — Service cards — stagger — */
  gsap.from('.service-card', {
    scrollTrigger: { trigger: '#services', start: 'top 100%', toggleActions: 'play none none none', once: true },
    y:       40,
    opacity: 0,
    duration: 0.5,
    stagger:  0.13,
    ease:     'power2.out',
    clearProps: 'all',
  });

  /* — Reviews section — */
  gsap.from('.reviews-swiper', {
    scrollTrigger: { trigger: '#reviews', start: 'top 100%', toggleActions: 'play none none none', once: true },
    y:       30,
    opacity: 0,
    duration: 0.6,
    ease:     'power2.out',
    clearProps: 'all',
  });

  /* — Contacts card — */
  gsap.from('#contacts .bg-bg', {
    scrollTrigger: { trigger: '#contacts', start: 'top 100%', toggleActions: 'play none none none', once: true },
    scale:   0.97,
    opacity: 0,
    duration: 0.6,
    ease:     'power3.out',
    clearProps: 'all',
  });

  /* — Sticky CTA — hide on desktop — */
  const cta = document.getElementById('sticky-cta');
  if (window.innerWidth >= 768) cta.style.display = 'none';
}

/* ══════════════════════════════════════════════════════════
   LIGHTBOX
══════════════════════════════════════════════════════════ */
function initLightbox() {
  const lb    = document.getElementById('lightbox');
  const img   = document.getElementById('lightbox-img');
  const close = document.getElementById('lightbox-close');

  const show = () => {
    lb.classList.remove('hidden');
    lb.classList.add('flex');
    requestAnimationFrame(() => lb.classList.add('opacity-100'));
  };
  const hide = () => {
    lb.classList.remove('opacity-100');
    setTimeout(() => {
      lb.classList.add('hidden');
      lb.classList.remove('flex');
    }, 300);
  };

  close.addEventListener('click', hide);
  lb.addEventListener('click', e => { if (e.target === lb) hide(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });

  window.openLightbox = src => { img.src = src; show(); };
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function setHref(id, href) {
  const el = document.getElementById(id);
  if (el) el.href = href;
}

/* ══════════════════════════════════════════════════════════
   INTERACTIVE DIAGNOSTIC CONFIGURATOR (4 STEPS, 2026 HUD)
══════════════════════════════════════════════════════════ */
function initCalculator() {
  const step1 = document.getElementById('calc-step-1');
  const step2 = document.getElementById('calc-step-2');
  const step3 = document.getElementById('calc-step-3-hud');
  const step4 = document.getElementById('calc-step-4');
  if (!step1 || !step2 || !step3 || !step4) return;

  const stepsIndicators = document.querySelectorAll('.calc-led-step');

  let selectedCar = 'Отечественный (ВАЗ, ГАЗ)';
  let carMultiplier = 1.0;
  let selectedSymptom = 'Не заводится / стартер молчит';
  let basePrice = 2000;
  let estimatedTime = '25-35 мин';
  let zoneName = 'В пределах КАД СПб';
  let zoneMultiplier = 1.0;
  let zoneEta = '25-35 мин';
  let isUrgent = false;
  let finalPrice = 2000;

  function updateSteps(activeStepIndex) {
    stepsIndicators.forEach(st => {
      const stepNum = parseInt(st.getAttribute('data-step'), 10);
      st.classList.remove('active', 'completed');
      if (stepNum === activeStepIndex) {
        st.classList.add('active');
      } else if (stepNum < activeStepIndex) {
        st.classList.add('completed');
      }
    });
  }

  // Step 1: Car Selection
  step1.querySelectorAll('.calc-hud-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      step1.querySelectorAll('.calc-hud-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      selectedCar = btn.querySelector('.font-bold')?.textContent || 'Автомобиль';
      carMultiplier = parseFloat(btn.getAttribute('data-cost-mult')) || 1.0;

      updateSteps(2);
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
    });
  });

  // Step 2: Symptom Selection
  step2.querySelectorAll('.calc-hud-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      step2.querySelectorAll('.calc-hud-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      selectedSymptom = btn.getAttribute('data-symptom') || 'Неисправность';
      basePrice = parseInt(btn.getAttribute('data-base-price'), 10) || 2000;
      estimatedTime = btn.getAttribute('data-time') || '25-35 мин';

      updateSteps(3);
      step2.classList.add('hidden');
      step3.classList.remove('hidden');
    });
  });

  // Step 3: Location Selection & Urgent toggle
  step3.querySelectorAll('.calc-hud-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      step3.querySelectorAll('.calc-hud-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      zoneName = btn.querySelector('.font-bold')?.textContent || 'В пределах КАД СПб';
      zoneMultiplier = parseFloat(btn.getAttribute('data-zone-mult')) || 1.0;
      zoneEta = btn.getAttribute('data-zone-eta') || '25-35 мин';
    });
  });

  // Default select first zone in step 3
  const firstZoneBtn = step3.querySelector('.calc-hud-btn');
  if (firstZoneBtn) firstZoneBtn.classList.add('selected');

  // Urgent toggle
  const urgentToggle = document.getElementById('calc-urgent-toggle');
  if (urgentToggle) {
    urgentToggle.addEventListener('change', (e) => {
      isUrgent = e.target.checked;
    });
  }

  // Calculate button (Step 3 -> Step 4)
  document.getElementById('calc-to-result')?.addEventListener('click', () => {
    const urgentMultiplier = isUrgent ? 1.25 : 1.0;
    finalPrice = Math.round((basePrice * carMultiplier * zoneMultiplier * urgentMultiplier) / 100) * 100;
    
    const finalEta = isUrgent ? '15–20 мин (Экстренно)' : zoneEta;

    const timeEl = document.getElementById('calc-res-time');
    const priceEl = document.getElementById('calc-res-price');
    const descEl = document.getElementById('calc-res-desc');

    if (timeEl) timeEl.textContent = `~${finalEta}`;
    if (priceEl) priceEl.textContent = `от ${finalPrice.toLocaleString('ru-RU')} ₽`;
    if (descEl) descEl.textContent = `Авто: ${selectedCar} • Поломка: ${selectedSymptom} • Локация: ${zoneName} ${isUrgent ? '(Экстренный выезд)' : ''}`;

    updateSteps(4);
    step3.classList.add('hidden');
    step4.classList.remove('hidden');
  });

  // Back button (Step 2 -> Step 1)
  document.getElementById('calc-back-1')?.addEventListener('click', () => {
    updateSteps(1);
    step2.classList.add('hidden');
    step1.classList.remove('hidden');
  });

  // Back button (Step 3 -> Step 2)
  document.getElementById('calc-back-2')?.addEventListener('click', () => {
    updateSteps(2);
    step3.classList.add('hidden');
    step2.classList.remove('hidden');
  });

  // Restart button (Step 4 -> Step 1)
  document.getElementById('calc-restart-btn')?.addEventListener('click', () => {
    updateSteps(1);
    step4.classList.add('hidden');
    step1.classList.remove('hidden');
  });

  // Apply button (Step 4 -> Open Request Modal with filled telemetry summary)
  document.getElementById('calc-apply-btn')?.addEventListener('click', () => {
    const summary = `[Бортовой конфигуратор]\nАвто: ${selectedCar}\nПоломка: ${selectedSymptom}\nЛокация: ${zoneName}\nСрочность: ${isUrgent ? 'Экстренный вызов (15-20 мин)' : 'Штатный'}\nРасчет: от ${finalPrice} ₽`;
    if (typeof window.openRequestModal === 'function') {
      window.openRequestModal(summary);
    }
  });
}

/* ── Run ── */
document.addEventListener('DOMContentLoaded', init);
