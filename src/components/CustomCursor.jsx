import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = -100, my = -100;
    let rx = -100, ry = -100;
    let raf;

    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    const lerp = (a, b, n) => a + (b - a) * n;

    const animate = () => {
      rx = lerp(rx, mx, 0.12);
      ry = lerp(ry, my, 0.12);
      dot.style.transform = `translate(${mx - 3}px, ${my - 3}px)`;
      ring.style.transform = `translate(${rx - 16}px, ${ry - 16}px)`;
      raf = requestAnimationFrame(animate);
    };

    const onEnter = () => ring.classList.add('hovering');
    const onLeave = () => ring.classList.remove('hovering');

    document.addEventListener('mousemove', onMove);
    document.querySelectorAll('a, button, .glass, .fab, [data-hover]').forEach(el => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    animate();

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-[6px] h-[6px] rounded-full bg-cyan-400 pointer-events-none z-[9999]"
        style={{ boxShadow: '0 0 10px rgba(6,182,212,0.6)' }}
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-[32px] h-[32px] rounded-full border border-cyan-400/30 pointer-events-none z-[9998] transition-all duration-200"
      />
    </>
  );
}
