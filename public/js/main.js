/* ============================================================
   main.js — AutoElectro
   Загрузка данных → рендер всех секций → GSAP анимации
============================================================ */


/* ── State ── */
let DATA = {};

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

  renderHero();
  renderServices();
  renderReviews();
  renderContacts();

  lucide.createIcons();          // render all lucide icons after DOM is ready
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  initNavbar();
  initAnimations();
  initLightbox();
  initCalculator();
  initRequestModal();
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


function renderServices() {
  const grid = document.getElementById('services-grid');
  if (!grid || !DATA.services?.length) return;

  grid.innerHTML = DATA.services.map(s => `
    <div class="service-card reveal
                bg-bg border border-border rounded-3xl p-5
                flex flex-col sm:flex-row gap-4 items-start
                card-hover">
      <div class="shrink-0 w-14 h-14 rounded-2xl bg-accent/10
                  flex items-center justify-center">
        <i data-lucide="${s.icon}" class="w-6 h-6 text-accent"></i>
      </div>
      <div>
        <h3 class="font-bold text-white text-lg mb-2">${s.title}</h3>
        <p class="text-gray-400 text-sm leading-relaxed mb-4">${s.description}</p>
        <span class="inline-block bg-accent/10 text-accent
                     font-bold text-sm px-4 py-1.5 rounded-full">
          ${s.price}
        </span>
      </div>
    </div>
  `).join('');
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
   EXPRESS FAULT CALCULATOR (3 STEPS)
══════════════════════════════════════════════════════════ */
function initCalculator() {
  const step1 = document.getElementById('calc-step-1');
  const step2 = document.getElementById('calc-step-2');
  const step3 = document.getElementById('calc-step-3');
  const progressFill = document.getElementById('calc-progress-fill');
  if (!step1 || !step2 || !step3) return;

  let selectedCar = 'Отечественный';
  let carMultiplier = 1.0;
  let selectedSymptom = 'Не заводится / стартер молчит';
  let basePrice = 2000;
  let estimatedTime = '25-35 мин';
  let finalPrice = 2000;

  // Step 1: Car Category
  step1.querySelectorAll('.calc-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCar = btn.getAttribute('data-val') || 'Автомобиль';
      carMultiplier = parseFloat(btn.getAttribute('data-cost-mult')) || 1.0;

      if (progressFill) progressFill.style.width = '66.66%';
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
    });
  });

  // Step 2: Symptom
  step2.querySelectorAll('.calc-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSymptom = btn.getAttribute('data-symptom') || 'Неисправность';
      basePrice = parseInt(btn.getAttribute('data-base-price'), 10) || 2000;
      estimatedTime = btn.getAttribute('data-time') || '25-35 мин';

      finalPrice = Math.round((basePrice * carMultiplier) / 100) * 100;

      const timeEl = document.getElementById('calc-res-time');
      const priceEl = document.getElementById('calc-res-price');
      const descEl = document.getElementById('calc-res-desc');

      if (timeEl) timeEl.textContent = `~${estimatedTime}`;
      if (priceEl) priceEl.textContent = `от ${finalPrice.toLocaleString('ru-RU')} ₽`;
      if (descEl) descEl.textContent = `Категория: ${selectedCar} • Поломка: ${selectedSymptom}`;

      if (progressFill) progressFill.style.width = '100%';
      step2.classList.add('hidden');
      step3.classList.remove('hidden');
    });
  });

  // Back button (Step 2 -> Step 1)
  document.getElementById('calc-back-1')?.addEventListener('click', () => {
    if (progressFill) progressFill.style.width = '33.33%';
    step2.classList.add('hidden');
    step1.classList.remove('hidden');
  });

  // Restart button (Step 3 -> Step 1)
  document.getElementById('calc-restart-btn')?.addEventListener('click', () => {
    if (progressFill) progressFill.style.width = '33.33%';
    step3.classList.add('hidden');
    step1.classList.remove('hidden');
  });

  // Apply button (Step 3 -> Open Request Modal with filled problem text)
  document.getElementById('calc-apply-btn')?.addEventListener('click', () => {
    const summary = `[Экспресс-калькулятор]\nКатегория авто: ${selectedCar}\nНеисправность: ${selectedSymptom}\nПредварительно: от ${finalPrice} ₽ (~${estimatedTime})`;
    if (typeof window.openRequestModal === 'function') {
      window.openRequestModal(summary);
    }
  });
}

/* ══════════════════════════════════════════════════════════
   REQUEST MODAL & FORM (Decoupled from mascot)
══════════════════════════════════════════════════════════ */
function initRequestModal() {
  const modalReq      = document.getElementById('modal-request');
  const closeReqModal = document.getElementById('close-request-modal');
  const heroReqBtn    = document.getElementById('hero-request-btn');
  const stickyReqBtn  = document.getElementById('sticky-request-btn');
  const formPubReq    = document.getElementById('form-public-request');
  const reqSuccess    = document.getElementById('req-success');
  const reqError      = document.getElementById('req-error');

  window.openRequestModal = function(prefillProblem) {
    if (!modalReq) return;
    if (prefillProblem && formPubReq) {
      const p = formPubReq.querySelector('[name="problem"]');
      if (p) p.value = prefillProblem;
    }
    modalReq.classList.remove('hidden');
    modalReq.classList.add('flex');
    if (reqSuccess) reqSuccess.classList.add('hidden');
    if (reqError) reqError.classList.add('hidden');
  };

  window.closeRequestModal = function() {
    if (!modalReq) return;
    modalReq.classList.add('hidden');
    modalReq.classList.remove('flex');
  };

  heroReqBtn?.addEventListener('click', () => window.openRequestModal());
  stickyReqBtn?.addEventListener('click', () => window.openRequestModal());
  closeReqModal?.addEventListener('click', () => window.closeRequestModal());

  modalReq?.addEventListener('click', e => {
    if (e.target === modalReq) window.closeRequestModal();
  });

  if (formPubReq) {
    formPubReq.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = formPubReq.querySelector('button[type="submit"]');
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
          if (reqSuccess) reqSuccess.classList.remove('hidden');
          formPubReq.reset();
          if (typeof window.onMascotCelebration === 'function') {
            window.onMascotCelebration();
          }
          setTimeout(() => {
            window.closeRequestModal();
          }, 2200);
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
  }
}

/* ── Run ── */
document.addEventListener('DOMContentLoaded', init);
