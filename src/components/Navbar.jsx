import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef(null);
  const logoRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });

    gsap.fromTo(logoRef.current,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out', delay: 0.3 }
    );

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav ref={navRef} className={`nav-bar ${scrolled ? 'scrolled' : ''}`}>
      <div ref={logoRef} className="nav-logo" style={{ opacity: 0 }}>
        АВТО<span>ЭЛЕКТРИК</span>
        <span className="logo-bolt">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </span>
      </div>

      <div className="hidden md:flex items-center gap-10">
        {[
          { label: 'Услуги', id: 'services' },
          { label: 'Контакты', id: 'contacts' },
        ].map(({ label, id }) => (
          <button
            key={id}
            data-hover
            onClick={() => scrollTo(id)}
            className="text-[13px] tracking-[0.12em] uppercase text-[var(--text-3)] hover:text-[var(--accent)] transition-colors duration-400 bg-transparent border-none cursor-none font-semibold"
          >
            {label}
          </button>
        ))}

        <button
          data-hover
          onClick={() => scrollTo('contacts')}
          className="neon-btn text-[12px] py-3 px-7"
        >
          Связаться
        </button>
      </div>

      <div className="md:hidden flex flex-col gap-1.5 cursor-none" data-hover>
        {[0,1,2].map(i => (
          <span key={i} className="block w-6 h-0.5 bg-[var(--accent)] rounded-full" />
        ))}
      </div>
    </nav>
  );
}