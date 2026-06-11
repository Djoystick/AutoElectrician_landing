import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function Hero() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" id="hero">
      {/* Background glow orbs */}
      <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.07] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full bg-blue-600/[0.06] blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/[0.04] blur-[140px] pointer-events-none" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div ref={ref} className="relative z-10 max-w-4xl mx-auto px-5 md:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] tracking-[0.15em] uppercase text-slate-400 font-medium">
            Профессиональный автоэлектрик
          </span>
        </motion.div>

        {/* Main H1 with shock effect */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(40px,10vw,88px)] font-bold leading-[0.92] tracking-[-0.04em] mb-4"
        >
          <span className="block">Ремонт</span>
          <span className="block">
            <span
              className="shock-text glow-text"
              data-text="Автоэлектрики"
            >
              Автоэлектрики
            </span>
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(15px,2vw,18px)] text-slate-400 max-w-lg mx-auto leading-relaxed mb-10"
        >
          Быстро. Точно. Надёжно. Берём деньги только за результат,
          а не за предположения.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap gap-3 justify-center mb-14"
        >
          <a href="tel:+79960314637" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            Связаться с мастером
          </a>
          <button onClick={() => scrollTo('services')} className="btn btn-glass">
            Все услуги
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap justify-center gap-8 md:gap-12"
        >
          {[
            { num: '8+',   label: 'Лет опыта' },
            { num: '500+', label: 'Клиентов' },
            { num: '100%', label: 'Гарантия' },
            { num: '24/7', label: 'На связи' },
          ].map(({ num, label }) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-2xl md:text-3xl font-bold text-cyan-400">{num}</span>
              <span className="text-[10px] md:text-[11px] tracking-[0.15em] uppercase text-slate-500 mt-1">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none" />
    </section>
  );
}
