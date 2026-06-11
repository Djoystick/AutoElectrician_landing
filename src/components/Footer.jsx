export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="nav-logo text-[14px]">
        АВТО<span className="m-badge text-[9px] w-5 h-5">M</span>ЭЛЕКТРИК
      </div>
      <p className="text-[12px] text-[var(--text-3)]">
        © {year} — Профессиональный автоэлектрик
      </p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-3)]">Powered by</span>
        <span className="text-[var(--m-blue-light)] text-xs font-bold" style={{ fontFamily: 'var(--font-display)' }}>⚡</span>
      </div>
    </footer>
  );
}
