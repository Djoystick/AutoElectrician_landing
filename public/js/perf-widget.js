/* ============================================================
   perf-widget.js — Инспектор и счётчик производительности страниц
   AutoElectro Core v1.1.6
============================================================ */
(function() {
  'use strict';

  function initPerformanceWidget() {
    // Disable on mobile devices or narrow viewports to avoid overlapping CTA / buttons
    if (window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      return;
    }

    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) return;

    const totalTime = Math.round(nav.loadEventEnd ? (nav.loadEventEnd - nav.startTime) : (performance.now()));
    const ttfb = Math.round(nav.responseStart - nav.requestStart);
    const dns = Math.round(nav.domainLookupEnd - nav.domainLookupStart);
    const tcp = Math.round(nav.connectEnd - nav.connectStart);
    const domReady = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
    const htmlDownload = Math.round(nav.responseEnd - nav.responseStart);

    // Resources analysis
    const resources = performance.getEntriesByType('resource');
    const sortedRes = [...resources].sort((a, b) => b.duration - a.duration).slice(0, 6);

    let totalTransfer = 0;
    resources.forEach(r => totalTransfer += (r.transferSize || 0));
    const totalKb = Math.round(totalTransfer / 1024);

    // Status color
    let color = '#22c55e'; // Green
    let statusText = 'Быстро';
    if (totalTime > 2500) {
      color = '#ef4444'; // Red
      statusText = 'Медленно';
    } else if (totalTime > 1000) {
      color = '#f59e0b'; // Orange
      statusText = 'Средне';
    }

    // Console logging for diagnostics
    console.group(`⚡ [Performance] Загрузка страницы: ${totalTime}ms (${statusText})`);
    console.table({
      '1. DNS Lookup': `${dns} ms`,
      '2. TCP / TLS Handshake': `${tcp} ms`,
      '3. TTFB (Сервер)': `${ttfb} ms`,
      '4. Загрузка HTML': `${htmlDownload} ms`,
      '5. DOM Content Loaded': `${domReady} ms`,
      '6. Полная загрузка (Total)': `${totalTime} ms`,
      'Всего запросов': resources.length,
      'Передано данных': `${totalKb} KB`
    });
    console.log('Топ самых долгих ресурсов:');
    console.table(sortedRes.map(r => ({
      'Ресурс': r.name.split('/').pop().split('?')[0] || r.name,
      'Хост': new URL(r.name).hostname,
      'Время (ms)': Math.round(r.duration),
      'Размер (KB)': Math.round((r.transferSize || 0) / 1024)
    })));
    console.groupEnd();

    // Floating UI Widget
    const container = document.createElement('div');
    container.id = 'perf-widget-root';
    container.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 16px;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      user-select: none;
    `;

    // Pill button
    const pill = document.createElement('button');
    pill.style.cssText = `
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(8px);
      border: 1px solid ${color}80;
      color: #f8fafc;
      padding: 6px 12px;
      border-radius: 9999px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
      font-weight: 600;
      transition: all 0.2s ease;
    `;
    pill.innerHTML = `
      <span style="color:${color}; font-size:14px;">⚡</span>
      <span>${(totalTime / 1000).toFixed(2)}s</span>
      <span style="font-size:10px; opacity:0.6; padding-left:2px;">(TTFB: ${ttfb}ms)</span>
    `;

    // Details Modal / Popover
    const panel = document.createElement('div');
    panel.style.cssText = `
      display: none;
      position: absolute;
      bottom: 38px;
      left: 0;
      width: 320px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 14px;
      color: #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
    `;

    let resRows = sortedRes.map(r => {
      const shortName = r.name.split('/').pop().split('?')[0] || r.name;
      const host = new URL(r.name).hostname;
      return `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
          <span style="max-width:210px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#94a3b8;" title="${r.name}">
            <b>${host}</b>: ${shortName}
          </span>
          <span style="color:${r.duration > 500 ? '#f87171' : '#38bdf8'}; font-weight:600;">${Math.round(r.duration)}ms</span>
        </div>
      `;
    }).join('');

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #1e293b; padding-bottom:6px;">
        <span style="font-weight:700; color:#f8fafc; font-size:13px;">⚡ Анализ загрузки</span>
        <span style="color:${color}; font-weight:700; font-size:11px; background:${color}20; padding:2px 8px; border-radius:9999px;">${statusText} (${totalTime}ms)</span>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:12px; font-size:11px;">
        <div style="background:#1e293b; padding:6px 8px; border-radius:6px;">
          <div style="color:#94a3b8; font-size:10px;">Сервер (TTFB)</div>
          <div style="font-weight:700; color:${ttfb > 500 ? '#f87171' : '#38bdf8'};">${ttfb} ms</div>
        </div>
        <div style="background:#1e293b; padding:6px 8px; border-radius:6px;">
          <div style="color:#94a3b8; font-size:10px;">DOM Ready</div>
          <div style="font-weight:700; color:#f8fafc;">${domReady} ms</div>
        </div>
        <div style="background:#1e293b; padding:6px 8px; border-radius:6px;">
          <div style="color:#94a3b8; font-size:10px;">DNS + TLS</div>
          <div style="font-weight:700; color:#f8fafc;">${dns + tcp} ms</div>
        </div>
        <div style="background:#1e293b; padding:6px 8px; border-radius:6px;">
          <div style="color:#94a3b8; font-size:10px;">Запросов / Вес</div>
          <div style="font-weight:700; color:#f8fafc;">${resources.length} шт / ${totalKb} KB</div>
        </div>
      </div>

      <div style="font-weight:600; font-size:11px; margin-bottom:6px; color:#cbd5e1;">Самые долгие ресурсы:</div>
      <div style="max-height:140px; overflow-y:auto; margin-bottom:10px;">
        ${resRows}
      </div>

      <div style="border-top:1px solid #1e293b; padding-top:6px; font-size:10px; color:#64748b; text-align:right;">
        Нажмите, чтобы скрыть детали
      </div>
    `;

    pill.onclick = () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    };

    container.appendChild(panel);
    container.appendChild(pill);
    document.body.appendChild(container);
  }

  // Run on window load
  if (document.readyState === 'complete') {
    setTimeout(initPerformanceWidget, 100);
  } else {
    window.addEventListener('load', () => setTimeout(initPerformanceWidget, 150));
  }
})();
