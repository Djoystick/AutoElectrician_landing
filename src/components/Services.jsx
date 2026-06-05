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
      { opacity: 0, y: 56, scale: 0.96 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.9,
        ease: 'power3.out',
        delay: (index % 3) * 0.11,
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      }
    );

    // Subtle magnetic drift on hover
    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top  - rect.height / 2;
      gsap.to(el, {
        x: relX * 0.05,
        y: relY * 0.05,
        duration: 0.45,
        ease: 'power2.out',
      });
    };

    const handleLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,0.45)' });
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [index]);

  return (
    /* h-full on the wrapper so every cell in the CSS grid stretches to full row height */
    <div className="h-full">
      <div
        ref={cardRef}
        className="glass-card p-7 cursor-none h-full flex flex-col"
        data-hover
        style={{ opacity: 0 }}
      >
        {/* Card number — absolute, top-right */}
        <span className="service-num">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Icon container — larger, gradient bg, glow on hover */}
        <div className="service-icon">
          <span role="img" aria-label={service.name}>{service.icon}</span>
        </div>

        {/* Title — bold, tight tracking, Space Grotesk */}
        <h3 className="service-name">{service.name}</h3>

        {/* Description — muted, flex-grow pushes bottom bar down */}
        <p className="service-desc flex-grow">{service.desc}</p>

        {/* Bottom "more" bar — mt-auto guarantees bottom-alignment across all cards */}
        <div className="mt-auto pt-6 flex items-center gap-3">
          <div
            className="flex-1 h-px"
            style={{
              background: 'linear-gradient(to right, rgba(0,245,255,0.3), transparent)',
            }}
          />
          <span
            className="text-[11px] tracking-[0.2em] uppercase transition-colors duration-300"
            style={{ color: 'rgba(0,245,255,0.4)' }}
          >
            Подробнее
          </span>
          <svg
            width="13" height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: 'rgba(0,245,255,0.4)', flexShrink: 0 }}
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
      {/* Section header */}
      <div ref={headerRef} className="mb-16" style={{ opacity: 0 }}>
        <p className="section-label">Что я делаю</p>
        <h2 className="section-title">
          Услуги<br />
          <span className="neon-text">автоэлектрика</span>
        </h2>
      </div>

      {/* Grid — align-items: stretch via CSS so all cells fill the row height */}
      <div className="services-grid">
        {SERVICES.map((s, i) => (
          <ServiceCard key={s.name} service={s} index={i} />
        ))}
      </div>
    </section>
  );
}
