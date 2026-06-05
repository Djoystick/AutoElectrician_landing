import { useEffect, useRef } from 'react';

export default function ElectricCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    let W, H;

    // ── Particle grid ───────────────────────────────────────────
    const COLS = 28;
    const ROWS = 18;
    const particles = [];

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function buildGrid() {
      particles.length = 0;
      for (let i = 0; i <= COLS; i++) {
        for (let j = 0; j <= ROWS; j++) {
          particles.push({
            bx: (i / COLS) * W,
            by: (j / ROWS) * H,
            x:  (i / COLS) * W,
            y:  (j / ROWS) * H,
            vx: 0, vy: 0,
            offset: Math.random() * Math.PI * 2,
            speed:  0.3 + Math.random() * 0.4,
          });
        }
      }
    }

    resize();
    buildGrid();
    window.addEventListener('resize', () => { resize(); buildGrid(); });

    // ── Electric bolt helper ────────────────────────────────────
    function drawBolt(x1, y1, x2, y2, alpha, jagged = 4) {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 5) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);

      const steps = Math.max(3, Math.floor(len / 22));
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const mx = x1 + dx * t + (Math.random() - 0.5) * jagged * 2;
        const my = y1 + dy * t + (Math.random() - 0.5) * jagged * 2;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(x2, y2);

      ctx.strokeStyle = `rgba(0,245,255,${alpha})`;
      ctx.lineWidth = 0.7;
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 8;
      ctx.stroke();

      // bright core
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        ctx.lineTo(x1 + dx * t, y1 + dy * t);
      }
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(180,255,255,${alpha * 0.5})`;
      ctx.lineWidth = 0.3;
      ctx.shadowBlur = 2;
      ctx.stroke();
      ctx.restore();
    }

    // ── Spark nodes ─────────────────────────────────────────────
    const sparks = Array.from({ length: 12 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      life: Math.random(),
      speed: 0.004 + Math.random() * 0.006,
    }));

    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      t += 0.008;

      // ── Flowing grid ───────────────────────────────────────────
      const cols1 = COLS + 1;
      particles.forEach((p, idx) => {
        const wave = Math.sin(t * p.speed + p.offset) * 18;
        p.x = p.bx + wave;
        p.y = p.by + Math.cos(t * p.speed * 0.7 + p.offset) * 10;

        // draw dot
        const dotAlpha = 0.08 + 0.07 * Math.sin(t + p.offset);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,245,255,${dotAlpha})`;
        ctx.fill();

        // horizontal edge
        if (idx % cols1 < COLS) {
          const next = particles[idx + 1];
          if (next) {
            const a = 0.035 + 0.02 * Math.abs(Math.sin(t * 0.5 + p.offset));
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(next.x, next.y);
            ctx.strokeStyle = `rgba(0,120,180,${a})`;
            ctx.lineWidth = 0.6;
            ctx.shadowBlur = 0;
            ctx.stroke();
          }
        }

        // vertical edge
        if (idx + cols1 < particles.length) {
          const below = particles[idx + cols1];
          const a = 0.03 + 0.015 * Math.abs(Math.cos(t * 0.5 + p.offset));
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(below.x, below.y);
          ctx.strokeStyle = `rgba(0,100,160,${a})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });

      // ── Random electric arcs ────────────────────────────────────
      if (Math.random() < 0.12) {
        const a = particles[Math.floor(Math.random() * particles.length)];
        const b = particles[Math.floor(Math.random() * particles.length)];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 220 && dist > 40) {
          drawBolt(a.x, a.y, b.x, b.y, 0.35 + Math.random() * 0.25, 6);
        }
      }

      // ── Drifting sparks ─────────────────────────────────────────
      sparks.forEach(sp => {
        sp.life += sp.speed;
        if (sp.life > 1) {
          sp.life = 0;
          sp.x = Math.random() * W;
          sp.y = Math.random() * H;
        }
        const a = Math.sin(sp.life * Math.PI) * 0.7;
        const r = 2.5 * Math.sin(sp.life * Math.PI);

        ctx.save();
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,245,255,${a})`;
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();

        // shoot tiny bolt from spark occasionally
        if (Math.random() < 0.015) {
          const angle = Math.random() * Math.PI * 2;
          const len = 20 + Math.random() * 60;
          drawBolt(sp.x, sp.y, sp.x + Math.cos(angle) * len, sp.y + Math.sin(angle) * len, a * 0.5, 3);
        }
      });

      // ── Radial gradient vignette ────────────────────────────────
      const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
      grad.addColorStop(0, 'rgba(0,20,40,0)');
      grad.addColorStop(1, 'rgba(2,4,8,0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} id="electric-canvas" />;
}
