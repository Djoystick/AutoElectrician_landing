import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function Hero() {
  const badgeRef    = useRef(null);
  const titleRef    = useRef(null);
  const subtitleRef = useRef(null);
  const btnsRef     = useRef(null);
  const statsRef    = useRef(null);
  const scrollRef   = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.fromTo(badgeRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.9 }
      )
      .fromTo(titleRef.current.querySelectorAll('.line'),
        { opacity: 0, y: 80, skewY: 4 },
        { opacity: 1, y: 0, skewY: 0, duration: 1.1, stagger: 0.15 },
        '-=0.5'
      )
      .fromTo(subtitleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.9 },
        '-=0.6'
      )
      .fromTo(btnsRef.current.children,
        { opacity: 0, y: 24, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.12 },
        '-=0.5'
      )
      .fromTo(statsRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 },
        '-=0.4'
      )
      .fromTo(scrollRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1 },
        '-=0.2'
      );
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero-section" id="hero">
      <div className="scan-line" />

      <div className="relative z-10 max-w-6xl w-full mx-auto">
        {/* Badge */}
        <div ref={badgeRef} className="hero-badge" style={{ opacity: 0 }}>
          <span className="hero-badge-dot" />
          Профессиональный автоэлектрик
        </div>

        {/* Title with glitch */}
        <div ref={titleRef} className="mb-6 flex flex-col gap-1 md:gap-2">
          <h1
            className="hero-title glitch neon-text m-0"
            data-text="АВТОЭЛЕКТРИК"
            style={{ marginBottom: 0 }}
          >
            <span className="line block">АВТОЭЛЕКТРИК</span>
          </h1>
          <h2
            className="hero-title glitch neon-text-yellow m-0"
            data-text="ДИАГНОСТИКА"
            style={{ fontSize: 'clamp(28px, 7vw, 90px)', marginBottom: 0 }}
          >
            <span className="line block">ДИАГНОСТИКА</span>
          </h2>
        </div>

        {/* Subtitle */}
        <p ref={subtitleRef} className="hero-subtitle" style={{ opacity: 0 }}>
          Диагностика, ремонт электропроводки и профессиональное обслуживание
          электрооборудования любых автомобилей.
          Быстро. Точно. Надёжно.
        </p>

        {/* CTAs */}
        <div ref={btnsRef} className="flex flex-wrap gap-4 mb-20" style={{ opacity: 0 }}>
          <button
            data-hover
            onClick={() => scrollTo('contacts')}
            className="neon-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            Позвонить сейчас
          </button>
          <button
            data-hover
            onClick={() => scrollTo('services')}
            className="neon-btn neon-btn-yellow"
          >
            Все услуги
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="flex flex-wrap gap-12" style={{ opacity: 0 }}>
          {[
            { num: '8+',   label: 'Лет опыта' },
            { num: '500+', label: 'Клиентов' },
            { num: '100%', label: 'Гарантия' },
            { num: '24/7', label: 'На связи' },
          ].map(({ num, label }) => (
            <div key={label} className="flex flex-col">
              <span
                className="font-display text-4xl font-bold neon-text"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {num}
              </span>
              <span className="text-xs tracking-widest uppercase text-[var(--text-secondary)] mt-1">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ opacity: 0 }}
      >
        <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--text-secondary)]">
          Scroll
        </span>
        <div className="w-px h-12 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--neon-cyan)] to-transparent"
            style={{
              animation: 'scan 1.6s linear infinite',
              height: '200%',
              top: '-100%'
            }}
          />
        </div>
      </div>

      <div className="hero-line" />
    </section>
  );
}
