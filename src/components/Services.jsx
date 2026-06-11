import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SERVICES = [
  {
    icon: '🔬',
    name: 'Компьютерная диагностика',
    desc: 'Считывание ошибок ЭБУ, проверка всех систем — поддержка всех марок и моделей. Точный результат за 30 минут.',
  },
  {
    icon: '⚡',
    name: 'Поиск и устранение неисправностей электропроводки',
    desc: 'Обрывы, окисления, утечки тока — нахожу причину профессиональным оборудованием. Восстановление с гарантией.',
  },
  {
    icon: '🎵',
    name: 'Подключение автомагнитол',
    desc: 'Установка головных устройств, усилителей, сабвуферов и камер. Аккуратный монтаж без повреждения штатной проводки.',
  },
  {
    icon: '💡',
    name: 'Ремонт освещения',
    desc: 'Ремонт и замена фар, LED и ксеноновых ламп, габаритов, стоп-сигналов. Регулировка угла света фар по ГОСТ.',
  },
  {
    icon: '🛡️',
    name: 'Устранение коротких замыканий',
    desc: 'Быстрое нахождение и ликвидация КЗ в любых цепях. Защита от повторного возникновения неисправности.',
  },
  {
    icon: '🔋',
    name: 'Замена аккумуляторов, клемм и предохранителей',
    desc: 'Подбор АКБ под ваш автомобиль, обслуживание клемм, замена предохранителей. Проверка генератора в подарок.',
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
        duration: 0.9,
        ease: 'power3.out',
        delay: (index % 3) * 0.12,
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      }
    );

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top  - rect.height / 2;
      gsap.to(el, {
        x: relX * 0.05,
        y: relY * 0.05,
        duration: 0.5,
        ease: 'power2.out',
      });
    };

    const handleLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,0.4)' });
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [index]);

  return (
    <div className="h-full">
      <div
        ref={cardRef}
        className="glass-card p-8 cursor-none h-full flex flex-col"
        data-hover
        style={{ opacity: 0 }}
      >
        <span className="service-num">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="service-icon">
          <span role="img" aria-label={service.name}>{service.icon}</span>
        </div>

        <h3 className="service-name">{service.name}</h3>
        <p className="service-desc flex-grow">{service.desc}</p>

        <div className="service-bottom">
          <div className="service-bottom-line" />
          <span className="service-bottom-text">Подробнее</span>
          <svg
            className="service-bottom-arrow"
            width="14" height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
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
      <div ref={headerRef} className="mb-16" style={{ opacity: 0 }}>
        <p className="section-label mb-6">Что я делаю</p>
        <h2 className="section-title">
          Услуги<br />
          <span className="glow-text">автоэлектрика</span>
        </h2>
      </div>

      <div className="services-grid">
        {SERVICES.map((s, i) => (
          <ServiceCard key={s.name} service={s} index={i} />
        ))}
      </div>
    </section>
  );
}