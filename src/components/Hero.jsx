import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

function HeroGraphic() {
  return (
    <svg viewBox="0 0 500 500" fill="none" className="hero-graphic" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#33a0d1" />
          <stop offset="50%" stopColor="#373485" />
          <stop offset="100%" stopColor="#c52b30" />
        </linearGradient>
        <linearGradient id="boltC" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#33a0d1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#373485" stopOpacity="0.4" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="16" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Rings */}
      <circle cx="250" cy="250" r="210" stroke="rgba(51,160,209,0.08)" strokeWidth="1" className="hero-ring" />
      <circle cx="250" cy="250" r="170" stroke="rgba(55,52,133,0.1)" strokeWidth="1" className="hero-ring" />
      <circle cx="250" cy="250" r="130" stroke="rgba(197,43,48,0.08)" strokeWidth="1" className="hero-ring" />

      {/* Cross hairs */}
      <line x1="40" y1="250" x2="460" y2="250" stroke="rgba(51,160,209,0.06)" strokeWidth="0.5" />
      <line x1="250" y1="40" x2="250" y2="460" stroke="rgba(51,160,209,0.06)" strokeWidth="0.5" />

      {/* Circuit traces */}
      <path d="M80 250 L150 250 L170 230 L210 230" stroke="rgba(51,160,209,0.2)" strokeWidth="1.5" fill="none" className="hero-trace" />
      <path d="M420 250 L350 250 L330 270 L290 270" stroke="rgba(55,52,133,0.2)" strokeWidth="1.5" fill="none" className="hero-trace" />
      <path d="M250 80 L250 140 L230 160 L230 200" stroke="rgba(197,43,48,0.15)" strokeWidth="1.5" fill="none" className="hero-trace" />

      {/* Nodes */}
      <circle cx="210" cy="230" r="3" fill="rgba(51,160,209,0.5)" filter="url(#glow)" className="hero-node" />
      <circle cx="290" cy="270" r="3" fill="rgba(55,52,133,0.5)" filter="url(#glow)" className="hero-node" />
      <circle cx="230" cy="200" r="2.5" fill="rgba(197,43,48,0.5)" filter="url(#glow)" className="hero-node" />

      {/* M badge center */}
      <rect x="220" y="220" width="60" height="60" fill="none" stroke="rgba(51,160,209,0.15)" strokeWidth="1" />
      <text x="250" y="256" textAnchor="middle" fill="rgba(51,160,209,0.4)" fontFamily="Space Grotesk" fontSize="28" fontWeight="700">M</text>

      {/* Lightning bolt */}
      <g filter="url(#softGlow)" className="hero-bolt-main">
        <path d="M280 110 L210 230 L260 230 L220 390 L310 230 L260 230 Z" fill="url(#boltC)" opacity="0.75" />
        <path d="M280 110 L210 230 L260 230 L220 390 L310 230 L260 230 Z" fill="none" stroke="rgba(51,160,209,0.4)" strokeWidth="1" />
      </g>

      {/* Small decorative bolts */}
      <g opacity="0.35" filter="url(#glow)">
        <path d="M140 140 L125 175 L135 175 L120 210 L155 175 L145 175 Z" fill="url(#boltC)" />
      </g>
      <g opacity="0.25" filter="url(#glow)">
        <path d="M370 310 L355 345 L365 345 L350 380 L385 345 L375 345 Z" fill="url(#boltC)" />
      </g>

      {/* Accent dots */}
      <circle cx="100" cy="120" r="2" fill="rgba(51,160,209,0.4)" className="hero-node" />
      <circle cx="400" cy="130" r="1.5" fill="rgba(197,43,48,0.4)" className="hero-node" />
      <circle cx="410" cy="370" r="2" fill="rgba(55,52,133,0.4)" className="hero-node" />
      <circle cx="90" cy="380" r="1.5" fill="rgba(51,160,209,0.3)" className="hero-node" />
    </svg>
  );
}

export default function Hero() {
  const badgeRef    = useRef(null);
  const titleRef    = useRef(null);
  const descRef     = useRef(null);
  const btnsRef     = useRef(null);
  const statsRef    = useRef(null);
  const graphicRef  = useRef(null);
  const scrollRef   = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.fromTo(badgeRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8 }
      )
      .fromTo(titleRef.current.querySelectorAll('.line'),
        { opacity: 0, y: 60, skewY: 3 },
        { opacity: 1, y: 0, skewY: 0, duration: 1, stagger: 0.12 },
        '-=0.4'
      )
      .fromTo(descRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7 },
        '-=0.4'
      )
      .fromTo(btnsRef.current.children,
        { opacity: 0, y: 20, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08 },
        '-=0.3'
      )
      .fromTo(graphicRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out' },
        '-=1'
      )
      .fromTo(statsRef.current.children,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06 },
        '-=0.5'
      )
      .fromTo(scrollRef.current,
        { opacity: 0 },
        { opacity: 0.5, duration: 1 },
        '-=0.2'
      );
  }, []);

  useEffect(() => {
    gsap.to(graphicRef.current, {
      y: -10, duration: 3.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero" id="hero">
      <div className="m-stripe absolute top-0 left-0 right-0" />

      <div className="hero-grid relative z-10 w-full mx-auto" style={{ maxWidth: 1400 }}>
        <div className="flex flex-col">
          <div ref={badgeRef} className="mb-6" style={{ opacity: 0 }}>
            <div className="inline-flex items-center gap-3 border border-[var(--border)] px-4 py-2 text-[10px] tracking-[0.25em] uppercase text-[var(--m-blue-light)]">
              <span className="w-1.5 h-1.5 bg-[var(--m-blue-light)] animate-pulse" />
              Профессиональный автоэлектрик
            </div>
          </div>

          <div ref={titleRef} className="mb-4" style={{ opacity: 0 }}>
            <h1 className="hero-title m-0">
              <span className="line block">РЕМОНТ</span>
            </h1>
            <h2 className="hero-title-sub m-0">
              <span
                className="shock-text shock-glow"
                data-text="АВТОЭЛЕКТРИКИ"
              >
                АВТОЭЛЕКТРИКИ
              </span>
            </h2>
          </div>

          <p ref={descRef} className="hero-desc" style={{ opacity: 0 }}>
            Диагностика, ремонт электропроводки и профессиональное обслуживание
            электрооборудования любых автомобилей. Быстро. Точно. Надёжно.
          </p>

          <div ref={btnsRef} className="flex flex-wrap gap-3 mb-14" style={{ opacity: 0 }}>
            <a href="tel:+79960314637" data-hover className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Вызвать электрика
            </a>
            <button data-hover onClick={() => scrollTo('services')} className="btn btn-outline">
              Все услуги
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div ref={statsRef} className="flex flex-wrap gap-10" style={{ opacity: 0 }}>
            {[
              { num: '8+',   label: 'Лет опыта' },
              { num: '500+', label: 'Клиентов' },
              { num: '100%', label: 'Гарантия' },
              { num: '24/7', label: 'На связи' },
            ].map(({ num, label }) => (
              <div key={label} className="flex flex-col">
                <span className="text-3xl font-bold shock-glow" style={{ fontFamily: 'var(--font-display)', color: 'var(--m-blue-light)' }}>{num}</span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-3)] mt-1">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div ref={graphicRef} className="flex items-center justify-center" style={{ opacity: 0 }}>
          <HeroGraphic />
        </div>
      </div>

      {/* Scroll indicator */}
      <div ref={scrollRef} className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ opacity: 0 }}>
        <span className="text-[9px] tracking-[0.35em] uppercase text-[var(--text-3)]">Scroll</span>
        <div className="w-px h-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--m-blue-light)] to-transparent"
            style={{ animation: 'scan 1.8s linear infinite', height: '200%', top: '-100%' }} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 m-stripe" />
    </section>
  );
}
