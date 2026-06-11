import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

function HeroGraphic() {
  return (
    <svg
      viewBox="0 0 600 500"
      fill="none"
      className="hero-graphic"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="boltGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0066ff" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="boltGrad2" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#00f5ff" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="20" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer ring */}
      <circle cx="300" cy="250" r="200" stroke="rgba(0,245,255,0.08)" strokeWidth="1" className="hero-ring" />
      <circle cx="300" cy="250" r="160" stroke="rgba(0,245,255,0.06)" strokeWidth="1" className="hero-ring" />
      <circle cx="300" cy="250" r="120" stroke="rgba(139,92,246,0.08)" strokeWidth="1" className="hero-ring" />

      {/* Circuit traces */}
      <path d="M100 250 L180 250 L200 230 L240 230" stroke="rgba(0,245,255,0.15)" strokeWidth="1.5" fill="none" className="hero-trace" />
      <path d="M500 250 L420 250 L400 270 L360 270" stroke="rgba(0,245,255,0.15)" strokeWidth="1.5" fill="none" className="hero-trace" />
      <path d="M300 80 L300 140 L280 160 L280 190" stroke="rgba(139,92,246,0.15)" strokeWidth="1.5" fill="none" className="hero-trace" />
      <path d="M300 420 L300 360 L320 340 L320 310" stroke="rgba(139,92,246,0.15)" strokeWidth="1.5" fill="none" className="hero-trace" />

      {/* Corner nodes */}
      <circle cx="240" cy="230" r="4" fill="rgba(0,245,255,0.4)" filter="url(#glow)" className="hero-node" />
      <circle cx="360" cy="270" r="4" fill="rgba(0,245,255,0.4)" filter="url(#glow)" className="hero-node" />
      <circle cx="280" cy="190" r="3" fill="rgba(139,92,246,0.5)" filter="url(#glow)" className="hero-node" />
      <circle cx="320" cy="310" r="3" fill="rgba(139,92,246,0.5)" filter="url(#glow)" className="hero-node" />

      {/* Main lightning bolt */}
      <g filter="url(#softGlow)" className="hero-bolt-main">
        <path
          d="M330 120 L240 250 L310 250 L270 400 L380 250 L310 250 Z"
          fill="url(#boltGrad)"
          opacity="0.85"
        />
        <path
          d="M330 120 L240 250 L310 250 L270 400 L380 250 L310 250 Z"
          fill="none"
          stroke="rgba(0,245,255,0.6)"
          strokeWidth="1.5"
        />
      </g>

      {/* Small bolt decoration */}
      <g filter="url(#glow)" className="hero-bolt-small" opacity="0.5">
        <path
          d="M160 160 L140 200 L155 200 L140 240 L180 200 L165 200 Z"
          fill="url(#boltGrad2)"
        />
      </g>

      <g filter="url(#glow)" className="hero-bolt-small" opacity="0.4">
        <path
          d="M440 300 L420 340 L435 340 L420 380 L460 340 L445 340 Z"
          fill="url(#boltGrad2)"
        />
      </g>

      {/* Floating dots */}
      <circle cx="150" cy="130" r="2" fill="rgba(0,245,255,0.5)" className="hero-dot" />
      <circle cx="450" cy="150" r="2.5" fill="rgba(139,92,246,0.5)" className="hero-dot" />
      <circle cx="480" cy="350" r="2" fill="rgba(0,245,255,0.4)" className="hero-dot" />
      <circle cx="120" cy="370" r="2.5" fill="rgba(0,102,255,0.5)" className="hero-dot" />
      <circle cx="200" cy="420" r="1.5" fill="rgba(139,92,246,0.4)" className="hero-dot" />
      <circle cx="400" cy="100" r="2" fill="rgba(0,245,255,0.3)" className="hero-dot" />
    </svg>
  );
}

export default function Hero() {
  const badgeRef    = useRef(null);
  const titleRef    = useRef(null);
  const subtitleRef = useRef(null);
  const btnsRef     = useRef(null);
  const statsRef    = useRef(null);
  const graphicRef  = useRef(null);
  const scrollRef   = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.fromTo(badgeRef.current,
        { opacity: 0, y: 24, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.9 }
      )
      .fromTo(titleRef.current.querySelectorAll('.line'),
        { opacity: 0, y: 70, skewY: 4 },
        { opacity: 1, y: 0, skewY: 0, duration: 1.1, stagger: 0.14 },
        '-=0.5'
      )
      .fromTo(subtitleRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.8 },
        '-=0.5'
      )
      .fromTo(btnsRef.current.children,
        { opacity: 0, y: 24, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1 },
        '-=0.4'
      )
      .fromTo(graphicRef.current,
        { opacity: 0, scale: 0.85, rotate: -8 },
        { opacity: 1, scale: 1, rotate: 0, duration: 1.4, ease: 'power3.out' },
        '-=1.2'
      )
      .fromTo(statsRef.current.children,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 },
        '-=0.6'
      )
      .fromTo(scrollRef.current,
        { opacity: 0 },
        { opacity: 0.7, duration: 1.2 },
        '-=0.3'
      );
  }, []);

  // Floating animation for graphic
  useEffect(() => {
    gsap.to(graphicRef.current, {
      y: -12,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero-section" id="hero">
      <div className="scan-line" />

      {/* Ambient glow orbs */}
      <div className="ambient-orb ambient-orb--cyan absolute top-[15%] left-[10%] w-[600px] h-[600px]" />
      <div className="ambient-orb ambient-orb--purple absolute bottom-[10%] right-[5%] w-[500px] h-[500px]" />
      <div className="ambient-orb ambient-orb--blue absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px]" />

      <div className="relative z-10 max-w-7xl w-full mx-auto">
        <div className="hero-grid">
          {/* Left: text content */}
          <div className="hero-text-col">
            {/* Badge */}
            <div ref={badgeRef} className="hero-badge" style={{ opacity: 0 }}>
              <span className="hero-badge-dot" />
              Профессиональный автоэлектрик
            </div>

            {/* Title */}
            <div ref={titleRef} className="mb-5" style={{ opacity: 0 }}>
              <h1 className="hero-title m-0">
                <span className="line block glow-text">РЕМОНТ</span>
                <span className="line block">АВТОЭЛЕКТРИКИ</span>
              </h1>
            </div>

            {/* Subtitle */}
            <p ref={subtitleRef} className="hero-subtitle" style={{ opacity: 0 }}>
              Диагностика, ремонт электропроводки и профессиональное обслуживание
              электрооборудования любых автомобилей.
            </p>

            {/* CTA Buttons */}
            <div ref={btnsRef} className="flex flex-wrap gap-4 mb-14" style={{ opacity: 0 }}>
              <a
                href="tel:+79960314637"
                data-hover
                className="neon-btn hero-cta-primary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                Вызвать электрика
              </a>
              <button
                data-hover
                onClick={() => scrollTo('services')}
                className="neon-btn neon-btn--outline"
              >
                Все услуги
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            {/* Stats */}
            <div ref={statsRef} className="flex flex-wrap gap-10" style={{ opacity: 0 }}>
              {[
                { num: '8+',   label: 'Лет опыта' },
                { num: '500+', label: 'Клиентов' },
                { num: '100%', label: 'Гарантия' },
                { num: '24/7', label: 'На связи' },
              ].map(({ num, label }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-3xl font-bold glow-text font-display">{num}</span>
                  <span className="text-[11px] tracking-[0.18em] uppercase text-[var(--text-3)] mt-1.5">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: SVG graphic */}
          <div ref={graphicRef} className="hero-graphic-col" style={{ opacity: 0 }}>
            <HeroGraphic />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        style={{ opacity: 0 }}
      >
        <span className="text-[10px] tracking-[0.35em] uppercase text-[var(--text-3)]">
          Scroll
        </span>
        <div className="w-px h-12 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent)] to-transparent"
            style={{
              animation: 'scan 1.8s linear infinite',
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
