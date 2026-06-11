import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SERVICES = [
  {
    icon: '🔬',
    name: 'Компьютерная диагностика',
    desc: 'Считывание ошибок ЭБУ, полная проверка всех систем. Поддержка всех марок и моделей. Результат за 30 минут.',
  },
  {
    icon: '⚡',
    name: 'Ремонт электропроводки',
    desc: 'Обрывы, окисления, утечки тока — нахожу причину профессиональным оборудованием. Восстановление с гарантией.',
  },
  {
    icon: '🎵',
    name: 'Подключение магнитол',
    desc: 'Установка головных устройств, усилителей, сабвуферов и камер. Чистый монтаж без повреждения проводки.',
  },
  {
    icon: '💡',
    name: 'Ремонт освещения',
    desc: 'Замена фар, LED и ксеноновых ламп, габаритов, стоп-сигналов. Регулировка угла света по ГОСТ.',
  },
  {
    icon: '🛡️',
    name: 'Устранение КЗ',
    desc: 'Быстрое нахождение и ликвидация коротких замыканий в любых цепях. Защита от повторного возникновения.',
  },
  {
    icon: '🔋',
    name: 'Замена АКБ и клемм',
    desc: 'Подбор аккумулятора под ваш авто, обслуживание клемм, замена предохранителей. Проверка генератора.',
  },
];

function ServiceCard({ service, index }) {
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 32 },
      {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        delay: (index % 3) * 0.07,
        scrollTrigger: { trigger: cardRef.current, start: 'top 90%', toggleActions: 'play none none none' },
      }
    );
  }, [index]);

  return (
    <div ref={cardRef} className="service-card" data-hover style={{ opacity: 0 }}>
      {/* M-tricolor top bar — hidden by default, animates on hover */}
      <div className="service-card-bar" />

      {/* Number */}
      <span className="service-card-num">{String(index + 1).padStart(2, '0')}</span>

      {/* Icon with pulse */}
      <div className="service-card-icon">
        <span role="img" aria-label={service.name}>{service.icon}</span>
      </div>

      {/* Title */}
      <h3 className="service-card-title">{service.name}</h3>

      {/* Description */}
      <p className="service-card-desc">{service.desc}</p>

      {/* Bottom line */}
      <div className="service-card-bottom">
        <div className="service-card-line" />
        <span className="service-card-link">
          Подробнее
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: headerRef.current, start: 'top 85%' }
      }
    );
  }, []);

  return (
    <section className="py-20 px-4 md:px-12 relative z-10" id="services">
      <div className="max-w-6xl mx-auto">
        <div ref={headerRef} className="mb-10" style={{ opacity: 0 }}>
          <p className="section-label">Что я делаю</p>
          <h2 className="section-title">
            Услуги<br />
            <span className="shock-glow" style={{ color: 'var(--m-blue-light)' }}>автоэлектрика</span>
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
