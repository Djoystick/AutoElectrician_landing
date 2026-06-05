import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SERVICES = [
  {
    icon: '🔬',
    name: 'Компьютерная диагностика',
    desc: 'Профессиональная диагностика всех систем автомобиля. Поддержка всех марок и моделей. Точное считывание ошибок ЭБУ.',
  },
  {
    icon: '⚡',
    name: 'Поиск и устранение неисправностей электропроводки',
    desc: 'Профессиональный поиск обрывов, замыканий и окислений в бортовой сети. Восстановление с гарантией.',
  },
  {
    icon: '🎵',
    name: 'Подключение автомагнитол',
    desc: 'Установка и подключение любых головных устройств, усилителей, камер и акустики. Аккуратный монтаж.',
  },
  {
    icon: '💡',
    name: 'Ремонт освещения',
    desc: 'Ремонт и замена фар, LED-ламп, габаритных огней, стоп-сигналов. Настройка угла света фар.',
  },
  {
    icon: '🛡️',
    name: 'Устранение коротких замыканий',
    desc: 'Быстрое нахождение и ликвидация КЗ в любых цепях. Защита от повторного возникновения проблемы.',
  },
  {
    icon: '🔋',
    name: 'Замена аккумуляторов, клемм и предохранителей',
    desc: 'Подбор и замена АКБ, обслуживание клемм, замена блока предохранителей. Проверка генератора.',
  },
];

function ServiceCard({ service, index }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;

    gsap.fromTo(el,
      { opacity: 0, y: 60, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.85,
        ease: 'power3.out',
        delay: (index % 3) * 0.12,
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      }
    );

    // hover magnetic effect
    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top  - rect.height / 2;
      gsap.to(el, {
        x: relX * 0.06,
        y: relY * 0.06,
        duration: 0.4,
        ease: 'power2.out',
      });
    };

    const handleLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.5)' });
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [index]);

  return (
    <div
      ref={cardRef}
      className="glass-card p-7 cursor-none"
      data-hover
      style={{ opacity: 0 }}
    >
      {/* Card number */}
      <span className="service-num">
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Icon */}
      <div className="service-icon">
        <span>{service.icon}</span>
      </div>

      {/* Content */}
      <h3 className="service-name">{service.name}</h3>
      <p className="service-desc">{service.desc}</p>

      {/* Bottom bar */}
      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--neon-cyan)] to-transparent opacity-20 group-hover:opacity-60 transition-opacity" />
        <span className="text-[10px] tracking-widest uppercase text-[var(--neon-cyan)] opacity-40">
          Подробнее
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2" opacity="0.4">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  );
}

export default function Services() {
  const headerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: {
          trigger: headerRef.current,
          start: 'top 85%',
        },
      }
    );
  }, []);

  return (
    <section className="services-section" id="services">
      {/* Section header */}
      <div ref={headerRef} className="mb-16" style={{ opacity: 0 }}>
        <p className="section-label">Что я делаю</p>
        <h2 className="section-title">
          Услуги<br />
          <span className="neon-text">автоэлектрика</span>
        </h2>
      </div>

      {/* Grid */}
      <div className="services-grid">
        {SERVICES.map((s, i) => (
          <ServiceCard key={s.name} service={s} index={i} />
        ))}
      </div>
    </section>
  );
}
