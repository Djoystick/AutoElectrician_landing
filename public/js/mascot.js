/* ============================================================
   mascot.js — Электрон, маскот AutoElectro
   Онбординг при первом визите + плавающая кнопка-помощник
============================================================ */
'use strict';

const ONBOARD_KEY = 'ae_onboarded';

const STEPS = [
  {
    text: '👋 Привет! Я Электрон — помощник AutoElectro. Давай покажу, как работает сайт!',
    highlight: null,
  },
  {
    text: '📞 Здесь вы можете позвонить мастеру или оставить заявку онлайн — он перезвонит в течение часа.',
    highlight: '#hero-btns',
  },
  {
    text: '🔧 В этом разделе — все услуги с ценами. После ремонта всё автоматически попадает в ваш профиль.',
    highlight: '#services',
  },
  {
    text: '👤 А здесь — ваш личный кабинет. История ремонтов, гараж и напоминания о ТО всегда под рукой.',
    highlight: null,
    link: '/profile.html',
    linkText: 'Перейти в профиль →',
  },
];

const HINTS = {
  default: '⚡ Чем могу помочь? Напишите мастеру или оставьте заявку!',
  services: '🔧 Выберите нужную услугу — мастер приедет к вашей машине.',
  how: '📋 Всё просто: звонок → приезд → ремонт → запись в профиль.',
  reviews: '⭐ Реальные отзывы от клиентов. Вы тоже можете оставить — после ремонта.',
  contacts: '📱 Работаем 24/7. Звоните в любое время!',
};

let currentStep = 0;
let onboardingDone = localStorage.getItem(ONBOARD_KEY) === '1';

/* ── Elements ── */
const mascotChar   = document.getElementById('mascot-character');
const mascotBubble = document.getElementById('mascot-bubble');
const mascotText   = document.getElementById('mascot-text');
const mascotNext   = document.getElementById('mascot-next');
const mascotInd    = document.getElementById('mascot-step-indicator');
const mascotBtn    = document.getElementById('mascot-btn');

function showBubble(text, showLink) {
  mascotText.innerHTML = text;
  if (showLink) {
    mascotText.innerHTML += `<br/><a href="${showLink.href}"
      class="text-accent text-xs font-semibold hover:underline mt-1 block">${showLink.label}</a>`;
  }
  mascotBubble.classList.remove('hidden');
}

function hideBubble() {
  mascotBubble.classList.add('hidden');
}

function showStep(idx) {
  const step = STEPS[idx];
  mascotInd.textContent = `${idx + 1} / ${STEPS.length}`;
  mascotNext.textContent = idx < STEPS.length - 1 ? 'Далее' : 'Понятно!';

  showBubble(
    step.text,
    step.link ? { href: step.link, label: step.linkText } : null
  );

  // Highlight element
  document.querySelectorAll('.mascot-highlight').forEach(el => {
    el.classList.remove('mascot-highlight');
    el.style.outline = '';
  });
  if (step.highlight) {
    const el = document.querySelector(step.highlight);
    if (el) {
      el.style.outline = '2px solid rgba(0,180,253,0.6)';
      el.style.borderRadius = '16px';
      el.classList.add('mascot-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function finishOnboarding() {
  localStorage.setItem(ONBOARD_KEY, '1');
  onboardingDone = true;

  // Clear highlights
  document.querySelectorAll('.mascot-highlight').forEach(el => {
    el.style.outline = '';
    el.classList.remove('mascot-highlight');
  });

  hideBubble();
  // Slide mascot back down
  mascotChar.style.transform = 'translateY(100%)';
  setTimeout(() => mascotChar.classList.add('hidden'), 700);

  // Show persistent floating button
  mascotBtn.classList.remove('hidden');
}

/* ── Start onboarding ── */
function startOnboarding() {
  if (onboardingDone) {
    mascotBtn.classList.remove('hidden');
    return;
  }

  currentStep = 0;
  mascotChar.classList.remove('hidden');

  // Slide in mascot after short delay
  setTimeout(() => {
    mascotChar.style.transform = 'translateY(0)';
    setTimeout(() => showStep(0), 400);
  }, 1200);
}

/* ── Next button ── */
mascotNext?.addEventListener('click', () => {
  if (!onboardingDone) {
    currentStep++;
    if (currentStep >= STEPS.length) {
      finishOnboarding();
    } else {
      showStep(currentStep);
    }
  } else {
    hideBubble();
  }
});

/* ── Floating button: show context hint ── */
mascotBtn?.addEventListener('click', () => {
  if (!mascotBubble.classList.contains('hidden')) {
    hideBubble();
    return;
  }

  // Determine current section
  const sections = ['services', 'how', 'reviews', 'contacts'];
  let hint = HINTS.default;
  for (const id of sections) {
    const el = document.getElementById(id);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight / 2 && rect.bottom > 100) {
        hint = HINTS[id] || HINTS.default;
        break;
      }
    }
  }

  mascotInd.textContent = '';
  mascotNext.textContent = 'OK';
  showBubble(hint);
});

/* ── Request modal ── */
const modalReq       = document.getElementById('modal-request');
const closeReqModal  = document.getElementById('close-request-modal');
const heroReqBtn     = document.getElementById('hero-request-btn');
const formPubReq     = document.getElementById('form-public-request');
const reqSuccess     = document.getElementById('req-success');
const reqError       = document.getElementById('req-error');

function openRequestModal() {
  modalReq.classList.remove('hidden');
  modalReq.classList.add('flex');
  reqSuccess?.classList.add('hidden');
  reqError?.classList.add('hidden');
}

heroReqBtn?.addEventListener('click', openRequestModal);
document.getElementById('sticky-request-btn')?.addEventListener('click', openRequestModal);
closeReqModal?.addEventListener('click', () => {
  modalReq.classList.add('hidden');
  modalReq.classList.remove('flex');
});
modalReq?.addEventListener('click', e => {
  if (e.target === modalReq) {
    modalReq.classList.add('hidden');
    modalReq.classList.remove('flex');
  }
});

formPubReq?.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  reqSuccess?.classList.add('hidden');
  reqError?.classList.add('hidden');
  try {
    const res  = await fetch('/api/requests', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    const json = await res.json();
    if (json.ok) {
      reqSuccess?.classList.remove('hidden');
      e.target.reset();
      setTimeout(() => {
        modalReq.classList.add('hidden');
        modalReq.classList.remove('flex');
      }, 2500);
      // Mascot celebrates
      if (mascotBtn && !mascotBtn.classList.contains('hidden')) {
        mascotInd.textContent = '';
        mascotNext.textContent = 'OK';
        showBubble('🎉 Заявка принята! Мастер скоро свяжется с вами.');
      }
    } else {
      reqError?.classList.remove('hidden');
    }
  } catch {
    reqError?.classList.remove('hidden');
  }
});

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  startOnboarding();
});
