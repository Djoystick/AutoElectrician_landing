export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="nav-logo text-base">
        АВТО<span>ЭЛЕКТРИК</span>
      </div>

      <p className="footer-copy">
        © {year} — Профессиональный автоэлектрик. Все права защищены.
      </p>

      <div className="flex items-center gap-3">
        <span className="text-[11px] tracking-[0.2em] uppercase text-[var(--text-muted)]">
          Made with
        </span>
        <span style={{ color: 'var(--neon-cyan)', fontSize: 16 }}>⚡</span>
      </div>
    </footer>
  );
}