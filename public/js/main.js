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
      `<span class="text-gradient">${last}</span>`;
  }

  const subtitleEl = document.getElementById('hero-subtitle');
  if (s.heroSubtitle) subtitleEl.textContent = s.heroSubtitle;

  // Accepting requests badge
  const badge        = document.getElementById('hero-badge');
  const acceptingText = document.getElementById('hero-accepting-text');
  if (badge && acceptingText) {
    const accepting = s.acceptingRequests !== false;
    const dot = badge.querySelector('.pulse-ring')?.parentElement;
    if (!accepting) {
      badge.classList.add('opacity-60');
      acceptingText.textContent = 'Сейчас не принимаю вызовы';
      if (dot) { dot.querySelectorAll('span').forEach(sp => { sp.classList.remove('bg-green-500'); sp.classList.add('bg-gray-500'); }); }
    } else {
      acceptingText.textContent = 'Мастер сейчас принимает вызовы';
    }
  }

  // Phone links
  const phone     = c.phone || '+7 (999) 123-45-67';
  const phoneHref = 'tel:' + phone.replace(/[^\d+]/g, '');
  setHref('sticky-call-btn',   phoneHref);
  setHref('nav-call-btn',      phoneHref);
  setHref('hero-call-btn',     phoneHref);
  setHref('services-call-btn', phoneHref);

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
  const onScroll = () => {
    if (window.scrollY > 60) {
      nav.classList.add('glass', 'py-2');
      nav.classList.remove('py-4');
    } else {
      nav.classList.remove('glass', 'py-2');
      nav.classList.add('py-4');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
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

/* ── Run ── */
document.addEventListener('DOMContentLoaded', init);
