# DESIGN.md - Premium Tech (Apple / Stripe / Linear Style)

## Concept
A premium, highly polished, modern aesthetic inspired by Apple, Stripe, and Linear. The design must feel expensive, fluid, and technologically advanced. Mobile-First approach is mandatory.

## Space & Layout
- **Negative Space**: Generous, purposeful padding and margins. Elements should breathe.
- **Mobile-First**: Everything must be optimized for mobile screens first (compact, readable, thumb-friendly).

## Color Tokens
- **Background**: Deep, complex dark themes. DO NOT use `#000000`. Use deep graphite (`#09090b`), dark navy (`#020617`), or subtle dark mesh gradients.
- **Primary Accent**: Glowing, electric blue/cyan (`#06b6d4`, `#3b82f6`) or subtle purple.
- **Text**: Pure white (`#ffffff`) for primary headers, soft slate (`#94a3b8`) for secondary text.
- **Surfaces**: Frosted glass panels (Glassmorphism) with slight translucency (`bg-white/5` with `backdrop-blur-md`).

## Typography
- **Font**: Premium, highly legible sans-serif (Inter, SF Pro, or Roboto).
- **Hierarchy**: Strong contrast between large, heavy headers (`tracking-tight`) and readable, airy body text.

## UI Elements & Effects
- **Borders**: 1px subtle borders (`border-white/10`).
- **Glow & Shadows**: Soft, colored drop-shadows to create depth (not harsh borders).
- **Animations (Micro-interactions)**:
  - Elements should have smooth `transition-all duration-300`.
  - Cards should slightly lift or highlight their border on hover (Spotlight effect).
  - Reveal animations on scroll.
- **No Empty Voids**: Use subtle SVG patterns (dots/grids) or soft, blurred color orbs in the background to fill empty space without distracting.
