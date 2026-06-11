import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;

    let mx = -100, my = -100;
    let rx = -100, ry = -100;
    let raf;

    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    const lerp = (a, b, n) => a + (b - a) * n;

    const animate = () => {
      rx = lerp(rx, mx, 0.12);
      ry = lerp(ry, my, 0.12);
      dot.style.transform  = `translate(${mx - 3}px, ${my - 3}px)`;
      ring.style.transform = `translate(${rx - 16}px, ${ry - 16}px)`;
      raf = requestAnimationFrame(animate);
    };

    const onEnter = () => ring.classList.add('hovering');
    const onLeave = () => ring.classList.remove('hovering');

    document.addEventListener('mousemove', onMove);
    document.querySelectorAll('a, button, .card, [data-hover]')
      .forEach(el => {
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
      <div ref={dotRef}  className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}
