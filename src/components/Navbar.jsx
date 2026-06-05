import { useEffect, useRef, useState } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav ref={navRef} className={`nav-bar ${scrolled ? 'scrolled' : ''}`}>
      {/* Logo */}
      <div className="nav-logo">
        АВТО<span>ЭЛЕКТРИК</span>
      </div>

      {/* Links */}
      <div className="hidden md:flex items-center gap-8">
        {[
          { label: 'Услуги', id: 'services' },
          { label: 'Контакты', id: 'contacts' },
        ].map(({ label, id }) => (
          <button
            key={id}
            data-hover
            onClick={() => scrollTo(id)}
            className="text-sm tracking-widest uppercase text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors duration-300 bg-transparent border-none cursor-none"
          >
            {label}
          </button>
        ))}

        <button
          data-hover
          onClick={() => scrollTo('contacts')}
          className="neon-btn text-sm py-2.5 px-6"
        >
          Связаться
        </button>
      </div>

      {/* Mobile hamburger placeholder */}
      <div className="md:hidden flex flex-col gap-1.5 cursor-none" data-hover>
        {[0,1,2].map(i => (
          <span key={i} className="block w-6 h-px bg-[var(--neon-cyan)]" />
        ))}
      </div>
    </nav>
  );
}
