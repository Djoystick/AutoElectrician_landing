/* ============================================================
   mascot.js — Электрон, маскот-помощник AutoElectro
   Интерактивный помощник-диагност по запросу (on-demand)
   Форма заявки и калькулятор вынесены независимо в main.js
============================================================ */
'use strict';

(function () {
  /* ── DOM Elements ── */
  const mascotChar   = document.getElementById('mascot-character');
  const mascotBubble = document.getElementById('mascot-bubble');
  const mascotText   = document.getElementById('mascot-text');
  const mascotNext   = document.getElementById('mascot-next');
  const mascotInd    = document.getElementById('mascot-step-indicator');
  const mascotBtn    = document.getElementById('mascot-btn');

  if (!mascotBtn || !mascotBubble || !mascotText) return;

  // Make floating button visible by default (non-intrusive)
  mascotBtn.classList.remove('hidden');

  function showBubble(htmlContent) {
    mascotText.innerHTML = htmlContent;
    mascotBubble.classList.remove('hidden');
  }

  function hideBubble() {
    mascotBubble.classList.add('hidden');
  }

  /* ── Interactive diagnostic menu ── */
  function showDiagnosticMenu() {
    if (mascotInd) mascotInd.textContent = 'Диагностика';
    if (mascotNext) {
      mascotNext.textContent = 'Закрыть';
    }

    const menuHtml = `
      <div class="space-y-2">
        <p class="font-bold text-accent text-xs uppercase tracking-wider flex items-center gap-1">
          <span>⚡</span> Помощник Электрон
        </p>
        <p class="text-xs text-gray-200">Что случилось с автомобилем? Выберите для быстрого вызова:</p>
        <div class="grid grid-cols-1 gap-1.5 pt-1">
          <button type="button" class="mascot-chip text-left px-2.5 py-1.5 rounded-lg bg-bg/80 hover:bg-accent/20 border border-border hover:border-accent/40 text-xs text-white transition-colors flex items-center gap-2" data-symptom="Не заводится / стартер молчит">
            <span>⚡</span> <span>Не заводится / стартер</span>
          </button>
          <button type="button" class="mascot-chip text-left px-2.5 py-1.5 rounded-lg bg-bg/80 hover:bg-accent/20 border border-border hover:border-accent/40 text-xs text-white transition-colors flex items-center gap-2" data-symptom="Сел аккумулятор / нет зарядки">
            <span>🔋</span> <span>Сел аккумулятор / зарядка</span>
          </button>
          <button type="button" class="mascot-chip text-left px-2.5 py-1.5 rounded-lg bg-bg/80 hover:bg-accent/20 border border-border hover:border-accent/40 text-xs text-white transition-colors flex items-center gap-2" data-symptom="Сигнализация заблокировала запуск">
            <span>🚨</span> <span>Глючит сигнализация</span>
          </button>
          <button type="button" class="mascot-chip text-left px-2.5 py-1.5 rounded-lg bg-bg/80 hover:bg-accent/20 border border-border hover:border-accent/40 text-xs text-white transition-colors flex items-center gap-2" data-action="calc">
            <span>🧮</span> <span>Экспресс-калькулятор цены</span>
          </button>
        </div>
      </div>
    `;

    showBubble(menuHtml);

    // Attach click listeners to chips
    mascotText.querySelectorAll('.mascot-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const action = chip.getAttribute('data-action');
        const symptom = chip.getAttribute('data-symptom');

        if (action === 'calc') {
          hideBubble();
          const calcSec = document.getElementById('calculator');
          if (calcSec) calcSec.scrollIntoView({ behavior: 'smooth' });
          return;
        }

        if (symptom && typeof window.openRequestModal === 'function') {
          hideBubble();
          window.openRequestModal(`[Через маскота] Поломка: ${symptom}`);
        }
      });
    });
  }

  /* ── Button Click: Toggle Menu ── */
  mascotBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!mascotBubble.classList.contains('hidden')) {
      hideBubble();
    } else {
      showDiagnosticMenu();
    }
  });

  mascotNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    hideBubble();
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!mascotBubble.contains(e.target) && !mascotBtn.contains(e.target)) {
      hideBubble();
    }
  });

  /* ── Celebration hook called upon successful form submission ── */
  window.onMascotCelebration = function () {
    if (mascotInd) mascotInd.textContent = 'Готово';
    if (mascotNext) mascotNext.textContent = 'Отлично!';
    showBubble(`
      <div class="py-1">
        <p class="font-bold text-accent text-sm mb-1">🎉 Заявка принята!</p>
        <p class="text-xs text-gray-200">Мастер уже уведомлен в Telegram и свяжется с вами в течение часа.</p>
      </div>
    `);
    if (mascotChar) {
      mascotChar.classList.remove('hidden');
      mascotChar.style.transform = 'translateY(0)';
      setTimeout(() => {
        mascotChar.style.transform = 'translateY(100%)';
        setTimeout(() => mascotChar.classList.add('hidden'), 500);
      }, 3500);
    }
    setTimeout(() => {
      hideBubble();
    }, 4000);
  };
})();
