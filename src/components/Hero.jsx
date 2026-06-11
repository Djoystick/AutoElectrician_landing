import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function Hero() {
  const titleRef  = useRef(null);
  const descRef   = useRef(null);
  const btnsRef   = useRef(null);
  const statsRef  = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.fromTo(titleRef.current.querySelectorAll('.line'),
        { opacity: 0, y: 50, skewY: 3 },
        { opacity: 1, y: 0, skewY: 0, duration: 0.9, stagger: 0.1 }
      )
      .fromTo(descRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6 },
        '-=0.3'
      )
      .fromTo(btnsRef.current.children,
        { opacity: 0, y: 16, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.08 },
        '-=0.2'
      )
      .fromTo(statsRef.current.children,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.05 },
        '-=0.2'
      );
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero" id="hero">
      <div className="m-stripe absolute top-0 left-0 right-0" />

      <div className="relative z-10 w-full mx-auto max-w-5xl flex flex-col items-center text-center">
        {/* Main title with shock effect — THE primary H1 */}
        <div ref={titleRef} className="mb-5" style={{ opacity: 0 }}>
          <h1 className="hero-title m-0">
            <span className="line block">УСЛУГИ</span>
          </h1>
          <h2 className="hero-title-sub m-0">
            <span
              className="shock-text shock-glow"
              data-text="АВТОЭЛЕКТРИКА"
            >
              АВТОЭЛЕКТРИКА
            </span>
          </h2>
        </div>

        {/* Aggressive selling copy */}
        <p ref={descRef} className="hero-desc text-center" style={{ opacity: 0 }}>
          Быстро. Точно. Надёжно. Берем деньги только за проделанную работу
          и результат, а не за предположения.
        </p>

        {/* Primary CTA — immediately visible */}
        <div ref={btnsRef} className="flex flex-wrap gap-3 justify-center mb-12" style={{ opacity: 0 }}>
          <a href="tel:+79960314637" data-hover className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            Связаться с мастером
          </a>
          <button data-hover onClick={() => scrollTo('services')} className="btn btn-outline">
            Все услуги
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* Stats row */}
        <div ref={statsRef} className="flex flex-wrap gap-10 justify-center" style={{ opacity: 0 }}>
          {[
            { num: '8+',   label: 'Лет опыта' },
            { num: '500+', label: 'Клиентов' },
            { num: '100%', label: 'Гарантия' },
            { num: '24/7', label: 'На связи' },
          ].map(({ num, label }) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-2xl font-bold shock-glow" style={{ fontFamily: 'var(--font-display)', color: 'var(--m-blue-light)' }}>{num}</span>
              <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--text-3)] mt-1">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 m-stripe" />
    </section>
  );
}
