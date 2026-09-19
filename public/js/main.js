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

  // Title — only update if different from static HTML to avoid CLS flicker
  const titleEl = document.getElementById('hero-title');
  if (s.heroTitle && titleEl) {
    // Accent on last 2 words ("с выездом") — build carefully
    const words = s.heroTitle.trim().split(' ');
    if (words.length >= 2) {
      const accentWords = words.slice(-2).join(' ');
      const beforeWords = words.slice(0, -2).join(' ');
      const newHtml = (beforeWords ? beforeWords + ' ' : '') +
        `<span class="text-[#22c55e]">${accentWords}</span>`;
      if (titleEl.innerHTML.replace(/\s+/g, ' ').trim() !== newHtml.replace(/\s+/g, ' ').trim()) {
        titleEl.innerHTML = newHtml;
      }
    } else {
      // fallback: accent last word only
      const last = words.pop();
      const newHtml = words.join(' ') + (words.length ? ' ' : '') + `<span class="text-[#22c55e]">${last}</span>`;
      if (titleEl.innerHTML.replace(/\s+/g, ' ').trim() !== newHtml.replace(/\s+/g, ' ').trim()) {
        titleEl.innerHTML = newHtml;
      }
    }
  }

  const subtitleEl = document.getElementById('hero-subtitle');
  if (s.heroSubtitle && subtitleEl && subtitleEl.textContent.trim() !== s.heroSubtitle.trim()) {
    subtitleEl.textContent = s.heroSubtitle;
  }

  // Accepting requests badge (Living Status Indicator)
  const badge        = document.getElementById('hero-badge');
  const acceptingText = document.getElementById('hero-accepting-text');
  if (badge && acceptingText) {
    const accepting = s.acceptingRequests !== false;
    const dot = badge.querySelector('.status-dot');
    if (!accepting) {
      if (dot) {
        dot.style.background = '#eab308';
        dot.style.boxShadow = '0 0 8px rgba(234, 179, 8, 0.6)';
      }
      acceptingText.textContent = 'На выезде / Занят';
    } else {
      if (dot) {
        dot.style.background = '#22c55e';
        dot.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.6)';
      }
      acceptingText.textContent = 'Свободен • Выезд в течение 30 мин';
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

  // Dynamic price in metric card
  const priceBubble = document.getElementById('hero-bubble-price');
  if (priceBubble && DATA.services && DATA.services.length > 0) {
    priceBubble.textContent = DATA.services[0].price || 'от 800 ₽';
  }
}

/* ══════════════════════════════════════════════════════════
   SERVICES (Swiss Minimalist: Top 6 + Expandable Catalog)
══════════════════════════════════════════════════════════ */
const CORE_SERVICES_FALLBACK = [
  { title: 'Компьютерная диагностика ЭБУ', price: 'от 800 ₽', description: 'Считывание ошибок дилерским сканером, сброс Check Engine, проверка датчиков.' },
  { title: 'Выездной запуск / АКБ', price: 'от 1 500 ₽', description: 'Запуск бустером 12/24V, тест генератора и остаточной емкости АКБ под нагрузкой.' },
  { title: 'Поиск утечки тока и КЗ', price: 'от 1 000 ₽', description: 'Локализация паразитного разряда аккумулятора, устранение замыканий и обрывов.' },
  { title: 'Ремонт генератора и стартера', price: 'от 1 500 ₽', description: 'Диагностика щеточного узла, диодного моста, втягивающего реле, демонтаж на месте.' },
  { title: 'Отключение сигнализаций / иммо', price: 'от 1 500 ₽', description: 'Аварийное снятие блокировок, разблокировка StarLine, Pandora, радиометок.' },
  { title: 'Восстановление проводки', price: 'от 1 500 ₽', description: 'Пайка и герметизация жгутов моторного отсека, замена сгоревших разъемов.' }
];

function createServiceCardHTML(svc) {
  return `
    <div class="service-minimal-card" data-title="${svc.title}">
      <div class="flex-1 min-w-0 pr-3">
        <h3 class="text-sm sm:text-base font-semibold text-[#fafafa] truncate mb-0.5">${svc.title}</h3>
        <p class="text-xs text-[#a1a1aa] line-clamp-1">${svc.description || 'Выездная диагностика и устранение неисправности на месте'}</p>
      </div>
      <div class="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <span class="service-price-pill">${svc.price || 'по запросу'}</span>
        <button type="button" class="service-mini-btn cursor-pointer" data-service="${svc.title}">
          Заказать
        </button>
      </div>
    </div>
  `;
}

function renderServices() {
  const topListEl = document.getElementById('services-top-list');
  const fullGridEl = document.getElementById('services-grid-full');
  const toggleBtn = document.getElementById('toggle-services-btn');
  const toggleText = document.getElementById('toggle-services-text');
  const fullWrap = document.getElementById('full-services-wrap');
  const searchInput = document.getElementById('service-search');

  const allServices = (DATA.services && DATA.services.length >= 6)
    ? DATA.services
    : CORE_SERVICES_FALLBACK;

  const top6 = allServices.slice(0, 6);
  const remaining = allServices.slice(6);

  if (topListEl) {
    topListEl.innerHTML = top6.map(createServiceCardHTML).join('');
  }

  if (fullGridEl) {
    fullGridEl.innerHTML = (remaining.length > 0 ? remaining : allServices).map(createServiceCardHTML).join('');
  }

  // Toggle button logic
  if (toggleBtn && fullWrap) {
    toggleBtn.onclick = () => {
      const isHidden = fullWrap.classList.contains('hidden');
      if (isHidden) {
        fullWrap.classList.remove('hidden');
        if (toggleText) toggleText.textContent = 'Скрыть каталог ▲';
      } else {
        fullWrap.classList.add('hidden');
        if (toggleText) toggleText.textContent = `Показать все ${allServices.length} услуги ▾`;
      }
    };
  }

  // Live search
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', (e) => {
      const query = (e.target.value || '').trim().toLowerCase();
      const cards = fullGridEl ? fullGridEl.querySelectorAll('.service-minimal-card') : [];
      cards.forEach(card => {
        const title = (card.getAttribute('data-title') || '').toLowerCase();
        card.style.display = (!query || title.includes(query)) ? 'flex' : 'none';
      });
    });
  }

  // Order buttons delegation
  const handleOrderClick = (e) => {
    const btn = e.target.closest('.service-mini-btn');
    if (btn) {
      e.stopPropagation();
      const title = btn.getAttribute('data-service') || 'Услуга автоэлектрика';
      if (typeof window.openRequestModal === 'function') {
        window.openRequestModal('Заказ услуги: ' + title);
      }
    }
  };

  if (topListEl) topListEl.onclick = handleOrderClick;
  if (fullGridEl) fullGridEl.onclick = handleOrderClick;
}

function getReviewInitials(name) {
  if (!name) return 'АЭ';
  const clean = name.replace(/\(.*?\)/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
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
        <div class="flex items-center gap-3.5">
          <div class="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.12] text-accent font-bold text-xs flex items-center justify-center shrink-0">
            ${getReviewInitials(r.name)}
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
    .from('.metric-item',   { opacity: 0, y: 15, duration: 0.35, stagger: 0.08, clearProps: 'all' }, '-=0.2');

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
    y:        40,
    opacity:  0,
    duration: 0.5,
    stagger:  0.15,
    ease:     'power3.out',
    clearProps: 'all',
  });

  /* — Service cards — stagger — */
  gsap.from('.service-minimal-card', {
    scrollTrigger: { trigger: '#services', start: 'top 100%', toggleActions: 'play none none none', once: true },
    y:       25,
    opacity: 0,
    duration: 0.45,
    stagger:  0.08,
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
  if (cta && window.innerWidth >= 768) cta.style.display = 'none';
}

/* ══════════════════════════════════════════════════════════
   LIGHTBOX
══════════════════════════════════════════════════════════ */
function initLightbox() {
  const lb    = document.getElementById('lightbox');
  const img   = document.getElementById('lightbox-img');
  const close = document.getElementById('lightbox-close');
  if (!lb || !img || !close) return;

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
   CONFIGURATOR (3 STEPS, SWISS-MINIMALIST SAAS STYLE)
══════════════════════════════════════════════════════════ */
function initCalculator() {
  const step1 = document.getElementById('calc-step-1');
  const step2 = document.getElementById('calc-step-2');
  const step3 = document.getElementById('calc-step-3');
  if (!step1 || !step2 || !step3) return;

  const stepPills = document.querySelectorAll('.calc-step-pill');

  let selectedCar = 'Отечественный (ВАЗ, LADA)';
  let carMultiplier = 1.0;
  let selectedSymptom = 'Диагностика ЭБУ / Ошибки';
  let basePrice = 800;
  let finalPrice = 800;
  const estimatedTime = '25-35 мин';

  function setStep(stepNum) {
    stepPills.forEach(pill => {
      const pNum = parseInt(pill.getAttribute('data-step'), 10);
      pill.classList.toggle('active', pNum === stepNum);
    });

    step1.classList.toggle('hidden', stepNum !== 1);
    step2.classList.toggle('hidden', stepNum !== 2);
    step3.classList.toggle('hidden', stepNum !== 3);
  }

  // Step 1: Car Category
  step1.querySelectorAll('.calc-clean-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      step1.querySelectorAll('.calc-clean-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      selectedCar = btn.getAttribute('data-val') || 'Автомобиль';
      carMultiplier = parseFloat(btn.getAttribute('data-cost-mult')) || 1.0;

      setStep(2);
    });
  });

  // Step 2: Fault
  step2.querySelectorAll('.calc-clean-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      step2.querySelectorAll('.calc-clean-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      selectedSymptom = btn.getAttribute('data-symptom') || 'Неисправность';
      basePrice = parseInt(btn.getAttribute('data-base-price'), 10) || 1000;

      finalPrice = Math.round((basePrice * carMultiplier) / 100) * 100;

      const priceEl = document.getElementById('calc-res-price');
      const timeEl = document.getElementById('calc-res-time');
      const descEl = document.getElementById('calc-res-desc');

      if (priceEl) priceEl.textContent = `от ${finalPrice.toLocaleString('ru-RU')} ₽`;
      if (timeEl) timeEl.textContent = `~${estimatedTime}`;
      if (descEl) descEl.textContent = `Авто: ${selectedCar} • Поломка: ${selectedSymptom}`;

      setStep(3);
    });
  });

  // Back button (Step 2 -> Step 1)
  const back1 = document.getElementById('calc-back-1');
  if (back1) {
    back1.addEventListener('click', () => setStep(1));
  }

  // Restart button (Step 3 -> Step 1)
  const restartBtn = document.getElementById('calc-restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      step1.querySelectorAll('.calc-clean-btn').forEach(b => b.classList.remove('selected'));
      step2.querySelectorAll('.calc-clean-btn').forEach(b => b.classList.remove('selected'));
      setStep(1);
    });
  }

  // Apply button (Step 3 -> Modal)
  const applyBtn = document.getElementById('calc-apply-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const summary = `[Калькулятор]\nАвто: ${selectedCar}\nПоломка: ${selectedSymptom}\nОриентир: от ${finalPrice} ₽`;
      if (typeof window.openRequestModal === 'function') {
        window.openRequestModal(summary);
      }
    });
  }
}

/* ── Run ── */
/* With `defer`, DOMContentLoaded may have already fired — always call init() safely */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
