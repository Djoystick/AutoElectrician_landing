import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const TelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 1 0 23.888 12 12 12 0 0 0 11.944 0zm4.992 8.249l-2.025 9.545c-.15.668-.543.833-1.099.517l-3.04-2.239-1.468 1.41c-.162.163-.297.297-.609.297l.218-3.073 5.598-5.059c.243-.217-.054-.337-.375-.12l-6.919 4.356-2.981-.93c-.648-.202-.661-.648.135-.96l11.634-4.485c.54-.196 1.014.132.93.741z" />
  </svg>
);

export default function Contacts() {
  const ref = useRef(null);
  const labelRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ref.current, start: 'top 75%' },
      defaults: { ease: 'power3.out' },
    });

    tl.fromTo(labelRef.current, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.6 })
      .fromTo(titleRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.3')
      .fromTo(descRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
      .fromTo(cardsRef.current.children,
        { opacity: 0, y: 24, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.12 }, '-=0.2');
  }, []);

  return (
    <section className="py-24 px-4 md:px-12 relative z-10" id="contacts" ref={ref}>
      <div className="m-stripe w-full mb-20" />

      <div className="max-w-3xl mx-auto text-center">
        <p ref={labelRef} className="section-label justify-center mb-4" style={{ opacity: 0 }}>
          Связаться со мной
        </p>

        <h2 ref={titleRef} className="section-title text-center" style={{ opacity: 0, marginBottom: 16 }}>
          Готов к работе<br />
          <span className="shock-glow" style={{ color: 'var(--m-blue-light)' }}>прямо сейчас</span>
        </h2>

        <p ref={descRef} className="text-[var(--text-2)] text-[15px] leading-relaxed mb-10 max-w-md mx-auto" style={{ opacity: 0 }}>
          Выезд на место, диагностика на СТО или консультация — напишите
          или позвоните, и мы согласуем удобное время.
        </p>

        <div ref={cardsRef} className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="tel:+79960314637" className="contact-card" data-hover style={{ opacity: 0 }}>
            <span className="text-[var(--m-blue-light)]"><PhoneIcon /></span>
            +7 996 031 4637
          </a>
          <a href="https://t.me/DemonMSB" target="_blank" rel="noopener noreferrer"
             className="contact-card telegram" data-hover style={{ opacity: 0 }}>
            <span className="text-[#2AABEE]"><TelegramIcon /></span>
            @DemonMSB
          </a>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <span className="w-1.5 h-1.5 bg-emerald-500" style={{ animation: 'blink 2s ease-in-out infinite' }} />
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-3)]">
            Доступен для записи
          </span>
        </div>
      </div>

      <div className="m-stripe w-full mt-20" />
    </section>
  );
}
