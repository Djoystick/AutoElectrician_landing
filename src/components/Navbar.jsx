import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
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
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[rgba(2,6,23,0.8)] backdrop-blur-xl border-b border-white/[0.06]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-2.5 text-white no-underline">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              АВТО <span className="text-cyan-400">ЭЛЕКТРИК</span>
            </span>
          </a>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {links.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-[13px] text-slate-400 hover:text-white transition-colors duration-200 bg-transparent border-none cursor-none font-medium"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => scrollTo('contacts')}
              className="btn btn-primary text-[12px] py-2.5 px-6"
            >
              Связаться
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-[5px] bg-transparent border-none cursor-none p-1"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Меню"
          >
            <span className={`block w-5 h-[1.5px] bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-x-[3px] translate-y-[3px]' : ''}`} />
            <span className={`block w-5 h-[1.5px] bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-[1.5px] bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 translate-x-[3px] -translate-y-[3px]' : ''}`} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[55] md:hidden"
          >
            <div className="absolute inset-0 bg-[rgba(2,6,23,0.95)] backdrop-blur-2xl" onClick={() => setMenuOpen(false)} />
            <div className="relative z-10 flex flex-col justify-center h-full px-8 gap-7">
              <div className="w-12 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-600 mb-2" />
              {links.map(({ label, id }, i) => (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="text-left text-3xl font-bold tracking-tight text-white hover:text-cyan-400 transition-colors duration-200 bg-transparent border-none cursor-none"
                  onClick={() => scrollTo(id)}
                >
                  {label}
                </motion.button>
              ))}
              <div className="w-full h-[1px] bg-white/[0.06] my-2" />
              <motion.a
                href="tel:+79960314637"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.35 }}
                className="btn btn-primary text-[13px] py-3.5 px-7 w-fit"
                onClick={() => setMenuOpen(false)}
              >
                Позвонить
              </motion.a>
              <motion.a
                href="https://t.me/DemonMSB"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.35 }}
                className="text-cyan-400 text-sm font-medium"
                onClick={() => setMenuOpen(false)}
              >
                @DemonMSB
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
