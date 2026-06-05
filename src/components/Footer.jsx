export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="nav-logo text-sm">
        АВТО<span>ЭЛЕКТРИК</span>
      </div>

      <p className="footer-copy">
        © {year} — Профессиональный автоэлектрик. Все права защищены.
      </p>

      <div className="flex items-center gap-2">
        <span className="text-[10px] tracking-widest uppercase text-[rgba(122,155,191,0.4)]">
          Made with
        </span>
        <span style={{ color: 'var(--neon-cyan)', fontSize: 14 }}>⚡</span>
      </div>
    </footer>
  );
}
