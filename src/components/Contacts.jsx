import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const TelegramIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 1 0 23.888 12 12 12 0 0 0 11.944 0zm4.992 8.249l-2.025 9.545c-.15.668-.543.833-1.099.517l-3.04-2.239-1.468 1.41c-.162.163-.297.297-.609.297l.218-3.073 5.598-5.059c.243-.217-.054-.337-.375-.12l-6.919 4.356-2.981-.93c-.648-.202-.661-.648.135-.96l11.634-4.485c.54-.196 1.014.132.93.741z" />
  </svg>
);

export default function Contacts() {
  const sectionRef = useRef(null);
  const labelRef   = useRef(null);
  const titleRef   = useRef(null);
  const descRef    = useRef(null);
  const cardsRef   = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 75%',
      },
      defaults: { ease: 'power3.out' },
    });

    tl.fromTo(labelRef.current,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.7 }
      )
      .fromTo(titleRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.9 },
        '-=0.4'
      )
      .fromTo(descRef.current,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.7 },
        '-=0.5'
      )
      .fromTo(cardsRef.current.children,
        { opacity: 0, y: 40, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.18 },
        '-=0.4'
      )
      .fromTo(statusRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6 },
        '-=0.3'
      );
  }, []);

  return (
    <section className="contacts-section" id="contacts" ref={sectionRef}>
      {/* Ambient glow */}
      <div className="ambient-orb ambient-orb--cyan absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]" />

      <div className="section-divider mb-20" />

      <div className="contacts-inner relative z-10">
        <p ref={labelRef} className="section-label justify-center mb-6" style={{ opacity: 0 }}>
          Связаться со мной
        </p>

        <h2
          ref={titleRef}
          className="section-title"
          style={{ textAlign: 'center', opacity: 0, marginBottom: 24 }}
        >
          Готов к работе<br />
          <span className="glow-text">прямо сейчас</span>
        </h2>

        <p
          ref={descRef}
          className="text-[var(--text-secondary)] text-[16px] leading-relaxed mb-12 max-w-lg mx-auto"
          style={{ opacity: 0, textAlign: 'center' }}
        >
          Выезд на место, диагностика на СТО или консультация — напишите
          или позвоните, и мы согласуем удобное время.
        </p>

        <div ref={cardsRef} className="flex flex-col sm:flex-row items-center justify-center gap-5">
          <a
            href="tel:+79960314637"
            className="contact-card"
            data-hover
            style={{ opacity: 0 }}
          >
            <div className="contact-pulse-wrap">
              <div className="pulse-ring" />
              <div className="pulse-ring" style={{ animationDelay: '0.8s' }} />
            </div>
            <span className="relative z-10 text-[var(--accent)]">
              <PhoneIcon />
            </span>
            <span className="relative z-10">+7 996 031 4637</span>
          </a>

          <a
            href="https://t.me/DemonMSB"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-card telegram"
            data-hover
            style={{ opacity: 0 }}
          >
            <div className="contact-pulse-wrap">
              <div className="pulse-ring" style={{ borderColor: '#2AABEE' }} />
              <div className="pulse-ring" style={{ borderColor: '#2AABEE', animationDelay: '0.8s' }} />
            </div>
            <span className="relative z-10 text-[#2AABEE]">
              <TelegramIcon />
            </span>
            <span className="relative z-10">@DemonMSB</span>
          </a>
        </div>

        <div ref={statusRef} className="mt-12 flex items-center justify-center gap-4" style={{ opacity: 0 }}>
          <div
            className="w-2 h-2 rounded-full bg-emerald-400"
            style={{
              boxShadow: '0 0 12px #4ade80, 0 0 24px rgba(74,222,128,0.4)',
              animation: 'blink 2.5s ease-in-out infinite'
            }}
          />
          <span className="text-[12px] tracking-[0.2em] uppercase text-[var(--text-3)]">
            Доступен для записи
          </span>
        </div>
      </div>

      <div className="section-divider mt-20" />
    </section>
  );
}