# Task 002: Hero Section Enhancement & Mobile Menu Fix

## Context
You are supervised by the Senior Architect. The initial redesign was successfully deployed and looks premium, but user testing revealed a few critical UI/UX issues on mobile devices that need immediate fixing.

## Tasks

### 1. Fix Mobile Hamburger Menu (Navbar)
**File**: `src/components/Navbar.jsx` (or wherever the header/navbar is)
**Bug**: The mobile hamburger menu (three lines in the top right) is unresponsive. It does not open a menu when clicked.
**Fix**: 
- Implement state (`useState`) to toggle the mobile menu.
- Create a beautiful glassmorphism dropdown or full-screen overlay for the mobile menu that appears when the hamburger is clicked.
- The menu should contain links that smoothly scroll to sections (e.g., Services, Contacts).
- Add a close button (`X` icon) or animate the hamburger into an `X` when open.

### 2. Enrich the Hero Section (First Scroll Screen)
**File**: `src/components/Hero.jsx`
**Bug**: The first screen feels empty. It currently just has a small badge, a tiny glowing dot, and paragraph text. It lacks a strong visual hook.
**Fix**:
- **Add a massive, bold Headline (H1)**: Add a primary title like `РЕМОНТ АВТОЭЛЕКТРИКИ` or `ПРОФЕССИОНАЛЬНЫЙ АВТОЭЛЕКТРИК` with a neon text-shadow or gradient clipping. It must grab attention immediately.
- **Add Graphics/Visuals**: Integrate a sleek, modern SVG graphic (e.g., a glowing lightning bolt, an abstract car outline, or a tech-circuit pattern) to fill the empty space creatively. Use `framer-motion` to make it float or pulse.
- **Call to Action (CTA)**: Add a large, glowing primary button directly under the text saying "Связаться с мастером" or "Вызвать электрика", which triggers a phone call (`tel:+79960314637`) or opens Telegram.
- **Better Layout**: Organize the text, title, and new graphic into a balanced layout (e.g., stacking them nicely on mobile with appropriate spacing).

## Output
Apply the changes and write a brief summary in `.mimo_workflow/002_report.md`.
