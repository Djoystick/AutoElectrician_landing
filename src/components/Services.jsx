import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SERVICES = [
  {
    icon: '🔬',
    name: 'Диагностика ЭБУ',
    desc: 'Считывание ошибок, проверка всех систем. Результат за 30 минут.',
  },
  {
    icon: '⚡',
    name: 'Электропроводка',
    desc: 'Обрывы, утечки, окисления — нахожу и устраняю с гарантией.',
  },
  {
    icon: '🎵',
    name: 'Магнитолы и звук',
    desc: 'Установка головных устройств, усилителей, камер. Без повреждений.',
  },
  {
    icon: '💡',
    name: 'Освещение',
    desc: 'Замена фар, LED, ксенон. Регулировка по ГОСТ.',
  },
  {
    icon: '🛡️',
    name: 'Устранение КЗ',
    desc: 'Нахождение и ликвидация коротких замыканий. Защита от повтора.',
  },
  {
    icon: '🔋',
    name: 'АКБ и клеммы',
    desc: 'Подбор аккумулятора, обслуживание клемм, проверка генератора.',
  },
];

function ServiceCard({ service, index }) {
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0, duration: 0.5, ease: 'power3.out',
        delay: (index % 3) * 0.06,
        scrollTrigger: { trigger: cardRef.current, start: 'top 92%', toggleActions: 'play none none none' },
      }
    );
  }, [index]);

  return (
    <div ref={cardRef} className="service-card" data-hover style={{ opacity: 0 }}>
      <div className="service-card-bar" />
      <span className="service-card-num">{String(index + 1).padStart(2, '0')}</span>

      <div className="service-card-icon">
        <span role="img" aria-label={service.name}>{service.icon}</span>
      </div>

      <h3 className="service-card-title">{service.name}</h3>
      <p className="service-card-desc">{service.desc}</p>

      <div className="service-card-bottom">
        <div className="service-card-line" />
        <span className="service-card-link">
          Подробнее
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export default function Services() {
  const headerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: headerRef.current, start: 'top 88%' }
      }
    );
  }, []);

  return (
    <section className="py-16 px-4 md:px-12 relative z-10" id="services">
      <div className="max-w-6xl mx-auto">
        <div ref={headerRef} className="mb-8" style={{ opacity: 0 }}>
          <p className="section-label">Что я делаю</p>
          <h2 className="section-title mb-0">
            <span className="shock-glow" style={{ color: 'var(--m-blue-light)' }}>Мои услуги</span>
          </h2>
        </div>

        <div className="services-grid">
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.name} service={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
