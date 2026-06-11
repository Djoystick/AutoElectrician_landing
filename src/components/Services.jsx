import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const SERVICES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01" />
        <path d="M6 13h.01M10 13h.01M14 13h.01M18 13h.01" />
      </svg>
    ),
    name: 'Компьютерная диагностика',
    desc: 'Считывание ошибок ЭБУ, полная проверка всех систем. Поддержка всех марок. Результат за 30 минут.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    name: 'Ремонт электропроводки',
    desc: 'Обрывы, утечки, окисления — нахожу и устраняю профессиональным оборудованием. Гарантия.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    name: 'Подключение магнитол',
    desc: 'Установка головных устройств, усилителей, сабвуферов и камер. Без повреждения проводки.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
    name: 'Ремонт освещения',
    desc: 'Замена фар, LED и ксеноновых ламп, габаритов, стоп-сигналов. Регулировка по ГОСТ.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    name: 'Устранение КЗ',
    desc: 'Быстрое нахождение и ликвидация коротких замыканий. Защита от повторного возникновения.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="6" width="22" height="12" rx="2" />
        <path d="M23 13v-2" />
        <path d="M7 10v4M11 10v4M15 10v4" />
      </svg>
    ),
    name: 'Замена АКБ и клемм',
    desc: 'Подбор аккумулятора, обслуживание клемм, замена предохранителей. Проверка генератора.',
  },
];

function ServiceCard({ service, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-6 flex flex-col group cursor-default"
    >
      {/* Icon */}
      <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-cyan-400 mb-5 transition-all duration-300 group-hover:border-cyan-500/30 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] group-hover:scale-105">
        {service.icon}
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-white mb-2 tracking-tight">
        {service.name}
      </h3>

      {/* Description */}
      <p className="text-[13px] text-slate-400 leading-relaxed flex-grow">
        {service.desc}
      </p>

      {/* Bottom link */}
      <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center gap-2 opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
        <span className="text-[11px] font-medium text-cyan-400 tracking-wide uppercase">Подробнее</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </motion.div>
  );
}

export default function Services() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-40px' });

  return (
    <section className="py-20 md:py-28 px-5 md:px-8 relative z-10" id="services">
      <div className="max-w-6xl mx-auto">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <p className="section-label">Что я делаю</p>
          <h2 className="section-title">
            <span className="glow-text">Мои услуги</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.name} service={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
