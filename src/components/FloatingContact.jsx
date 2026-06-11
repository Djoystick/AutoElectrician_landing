import { useState, useEffect } from 'react';
import { gsap } from 'gsap';

export default function FloatingContact() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (visible) {
      gsap.fromTo('.floating-btn',
        { scale: 0, opacity: 0, rotate: -180 },
        { scale: 1, opacity: 1, rotate: 0, duration: 0.5, stagger: 0.15, ease: 'back.out(2)' }
      );
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="floating-contact" style={{
      position: 'fixed',
      bottom: '32px',
      right: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      zIndex: 90,
    }}>
      <a
        href="https://t.me/DemonMSB"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-btn"
        data-hover
        title="Telegram"
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)',
          color: 'white',
          textDecoration: 'none',
          boxShadow: '0 4px 24px rgba(42, 171, 238, 0.5), 0 0 60px rgba(42, 171, 238, 0.3)',
          transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
          cursor: 'none',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 1 0 23.888 12 12 12 0 0 0 11.944 0zm4.992 8.249l-2.025 9.545c-.15.668-.543.833-1.099.517l-3.04-2.239-1.468 1.41c-.162.163-.297.297-.609.297l.218-3.073 5.598-5.059c.243-.217-.054-.337-.375-.12l-6.919 4.356-2.981-.93c-.648-.202-.661-.648.135-.96l11.634-4.485c.54-.196 1.014.132.93.741z" />
        </svg>
      </a>
      <a
        href="tel:+79960314637"
        className="floating-btn"
        data-hover
        title="Позвонить"
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #00f5ff 0%, #0066ff 100%)',
          color: '#030712',
          textDecoration: 'none',
          boxShadow: '0 4px 24px rgba(0, 245, 255, 0.5), 0 0 60px rgba(0, 245, 255, 0.3)',
          transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
          cursor: 'none',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
      </a>
    </div>
  );
}