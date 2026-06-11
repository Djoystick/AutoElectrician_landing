import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SERVICES = [
  {
    icon: '🔬',
    name: 'Компьютерная диагностика',
    desc: 'Считывание ошибок ЭБУ, проверка всех систем — поддержка всех марок. Точный результат за 30 минут.',
  },
  {
    icon: '⚡',
    name: 'Ремонт электропроводки',
    desc: 'Обрывы, окисления, утечки тока — нахожу причину профессиональным оборудованием. Гарантия.',
  },
  {
    icon: '🎵',
    name: 'Подключение магнитол',
    desc: 'Установка головных устройств, усилителей, сабвуферов и камер. Без повреждения проводки.',
  },
  {
    icon: '💡',
    name: 'Ремонт освещения',
    desc: 'Замена фар, LED и ксеноновых ламп, габаритов, стоп-сигналов. Регулировка по ГОСТ.',
  },
  {
    icon: '🛡️',
    name: 'Устранение КЗ',
    desc: 'Быстрое нахождение и ликвидация коротких замыканий в любых цепях. Защита от повтора.',
  },
  {
    icon: '🔋',
    name: 'Замена АКБ и клемм',
    desc: 'Подбор аккумулятора, обслуживание клемм, замена предохранителей. Проверка генератора.',
  },
];

function ServiceCard({ service, index }) {
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
        delay: (index % 3) * 0.08,
        scrollTrigger: { trigger: cardRef.current, start: 'top 88%', toggleActions: 'play none none none' },
      }
    );
  }, [index]);

  return (
    <div className="h-full">
      <div ref={cardRef} className="card h-full flex flex-col cursor-none" data-hover style={{ opacity: 0 }}>
        <span className="card-num">{String(index + 1).padStart(2, '0')}</span>
        <div className="card-icon">{service.icon}</div>
        <h3 className="card-title">{service.name}</h3>
        <p className="card-desc flex-grow">{service.desc}</p>
        <div className="card-bottom">
          <div className="flex-1 h-px bg-gradient-to-r from-[var(--m-blue-light)] to-transparent opacity-30" />
          <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--m-blue-light)] font-semibold">Подробнее</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--m-blue-light)" strokeWidth="2">
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
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: headerRef.current, start: 'top 85%' }
      }
    );
  }, []);

  return (
    <section className="py-24 px-4 md:px-12 relative z-10" id="services">
      <div className="max-w-6xl mx-auto">
        <div ref={headerRef} className="mb-12" style={{ opacity: 0 }}>
          <p className="section-label">Что я делаю</p>
          <h2 className="section-title">
            Услуги<br />
            <span className="shock-glow" style={{ color: 'var(--m-blue-light)' }}>автоэлектрика</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border)]">
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.name} service={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
