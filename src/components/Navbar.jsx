import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      gsap.fromTo(menuRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(menuRef.current.querySelectorAll('.m-link'),
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.35, stagger: 0.05, delay: 0.1 }
      );
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const scrollTo = (id) => {
    setMenuOpen(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const links = [
    { label: 'Главная', id: 'hero' },
    { label: 'Услуги', id: 'services' },
    { label: 'Контакты', id: 'contacts' },
  ];

  return (
    <>
      <nav ref={navRef} className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-logo">
          АВТО
          <span className="m-badge">M</span>
          ЭЛЕКТРИК
        </div>

        <div className="hidden md:flex items-center gap-8">
          {links.map(({ label, id }) => (
            <button
              key={id}
              data-hover
              onClick={() => scrollTo(id)}
              className="text-[12px] tracking-[0.15em] uppercase text-[var(--text-3)] hover:text-[var(--m-blue-light)] transition-colors duration-300 bg-transparent border-none cursor-none font-semibold"
            >
              {label}
            </button>
          ))}
          <button
            data-hover
            onClick={() => scrollTo('contacts')}
            className="btn btn-primary text-[11px] py-2.5 px-6"
          >
            Связаться
          </button>
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden flex flex-col gap-[5px] cursor-none relative z-[110] bg-transparent border-none"
          data-hover
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Меню"
        >
          <span className="block w-6 h-[2px] bg-[var(--text-1)] transition-all duration-300"
            style={{ transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span className="block w-6 h-[2px] bg-[var(--text-1)] transition-all duration-300"
            style={{ opacity: menuOpen ? 0 : 1 }} />
          <span className="block w-6 h-[2px] bg-[var(--text-1)] transition-all duration-300"
            style={{ transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div ref={menuRef} className="fixed inset-0 z-[105] md:hidden" style={{ opacity: 0 }}>
          <div
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative z-10 flex flex-col justify-center h-full px-10 gap-8">
            <div className="m-stripe w-16 mb-4" />
            {links.map(({ label, id }) => (
              <button
                key={id}
                className="m-link text-left text-4xl font-bold tracking-[0.12em] uppercase text-[var(--text-1)] hover:text-[var(--m-blue-light)] transition-colors duration-300 bg-transparent border-none cursor-none"
                style={{ fontFamily: 'var(--font-display)', opacity: 0 }}
                onClick={() => scrollTo(id)}
              >
                {label}
              </button>
            ))}
            <div className="m-stripe w-full my-4" />
            <a
              href="tel:+79960314637"
              className="m-link btn btn-primary text-[13px] py-4 px-8 w-fit"
              style={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            >
              Позвонить
            </a>
            <a
              href="https://t.me/DemonMSB"
              target="_blank"
              rel="noopener noreferrer"
              className="m-link text-[var(--m-blue-light)] text-sm font-semibold"
              style={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            >
              @DemonMSB
            </a>
          </div>
        </div>
      )}
    </>
  );
}
