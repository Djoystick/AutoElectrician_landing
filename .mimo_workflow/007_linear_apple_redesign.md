# Task 007: Premium Tech Rebuild (Apple/Stripe/Linear)

## Context
We are discarding the previous black/brutalist design and writing the React/Vite site from scratch. You must build a highly polished, expensive-looking Landing Page for an Auto Electrician based on the new `DESIGN.md` guidelines (Apple/Linear style).

## Strict Requirements
1. **Design System**: Read and strictly apply the `DESIGN.md` file found in the root. Use deep space/graphite colors, subtle mesh gradients, and frosted glass (`backdrop-blur`).
2. **Mobile-First Structure**: Start your design assuming a mobile viewport. Ensure paddings and typography scale beautifully. No endless scrolling.
3. **Typography**: Use clean, modern sans-serif fonts with tight tracking for headers and ample line-height for body text.

## Crucial Components & Features
1. **Header (Navbar)**: 
   - Logo text: "АВТО ЭЛЕКТРИК" (no "М" badge). 
   - Clean, sticky, frosted glass background.
2. **Hero Section (`Hero.jsx`)**:
   - Must be the first thing the user sees. It MUST be fully populated.
   - **Main H1**: The huge text should be at the top center. It needs a premium "Electric Shock" or "Spark" animation (use `framer-motion` or a subtle CSS glow animation, not a cheap glitch). 
   - **Background**: Add a beautiful, subtle background (e.g., glowing orbs using absolute positioning and `blur-3xl`, or a faint grid pattern) so it's not an empty void.
   - **CTA Button**: A glowing, premium button right below the text.
3. **Services Section (`Services.jsx`)**:
   - Header: "Мои Услуги".
   - Cards: Glassmorphism panels (`bg-white/5`, `border-white/10`). Add a subtle hover effect (e.g., border lights up, card slightly lifts).
   - Use high-quality SVG icons or Lucide-react icons, NOT empty/banal graphics.
4. **Floating Contacts**: Keep the floating action buttons (Phone & Telegram) in the corner.

## Output
Rebuild the entire site in the `src/` folder using Tailwind CSS and `framer-motion`. Make it breathtaking. When done, write a report in `.mimo_workflow/007_report.md`.
