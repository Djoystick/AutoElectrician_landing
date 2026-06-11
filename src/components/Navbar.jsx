import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const logoRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });

    gsap.fromTo(logoRef.current,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out', delay: 0.3 }
    );

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      gsap.fromTo(menuRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo(menuRef.current.querySelectorAll('.menu-link'),
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.06, ease: 'power3.out', delay: 0.15 }
      );
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const scrollTo = useCallback((id) => {
    setMenuOpen(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const links = [
    { label: 'Главная', id: 'hero' },
    { label: 'Услуги', id: 'services' },
    { label: 'Контакты', id: 'contacts' },
  ];

  return (
    <>
      <nav ref={navRef} className={`nav-bar ${scrolled ? 'scrolled' : ''}`}>
        <div ref={logoRef} className="nav-logo" style={{ opacity: 0 }}>
          АВТО<span>ЭЛЕКТРИК</span>
          <span className="logo-bolt">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          {links.map(({ label, id }) => (
            <button
              key={id}
              data-hover
              onClick={() => scrollTo(id)}
              className="text-[13px] tracking-[0.12em] uppercase text-[var(--text-3)] hover:text-[var(--accent)] transition-colors duration-300 bg-transparent border-none cursor-none font-semibold"
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

        {/* Hamburger */}
        <button
          className="md:hidden flex flex-col gap-[5px] cursor-none relative z-[110]"
          data-hover
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Меню"
        >
          <span
            className="block w-6 h-[2px] bg-[var(--accent)] rounded-full transition-all duration-300"
            style={{
              transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none',
            }}
          />
          <span
            className="block w-6 h-[2px] bg-[var(--accent)] rounded-full transition-all duration-300"
            style={{
              opacity: menuOpen ? 0 : 1,
              transform: menuOpen ? 'translateX(-10px)' : 'none',
            }}
          />
          <span
            className="block w-6 h-[2px] bg-[var(--accent)] rounded-full transition-all duration-300"
            style={{
              transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
            }}
          />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed inset-0 z-[105] md:hidden"
          style={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: 'rgba(3,7,18,0.92)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
            }}
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-8">
            {links.map(({ label, id }) => (
              <button
                key={id}
                className="menu-link text-3xl font-bold tracking-[0.1em] uppercase text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors duration-300 bg-transparent border-none cursor-none"
                style={{ fontFamily: 'var(--font-display)', opacity: 0 }}
                onClick={() => scrollTo(id)}
              >
                {label}
              </button>
            ))}

            <div className="menu-link mt-4" style={{ opacity: 0 }}>
              <a
                href="tel:+79960314637"
                className="neon-btn text-[14px] py-4 px-10"
                onClick={() => setMenuOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                Позвонить
              </a>
            </div>

            {/* Decorative divider */}
            <div className="menu-link w-24 h-px my-2" style={{
              opacity: 0,
              background: 'linear-gradient(90deg, transparent, var(--neon-cyan), transparent)',
            }} />

            <div className="menu-link flex flex-col items-center gap-2" style={{ opacity: 0 }}>
              <span className="text-[11px] tracking-[0.2em] uppercase text-[var(--text-3)]">
                Telegram
              </span>
              <a
                href="https://t.me/DemonMSB"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--neon-cyan)] text-lg font-semibold hover:opacity-80 transition-opacity"
                style={{ fontFamily: 'var(--font-display)' }}
                onClick={() => setMenuOpen(false)}
              >
                @DemonMSB
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
