# Отчёт: Задание 007 — Premium Tech Rebuild (Apple/Linear)

## Дата: 2025-06-11

## Концепция

Полная пересборка с нуля в стиле Apple/Linear/Stripe. Глубокий graphite фон, glassmorphism, плавные анимации появления, premium типографика.

## Дизайн-система

### Фоны
- Deep space: `#020617` — основной фон (НЕ чёрный `#000`)
- Surface: `#09090b` — карточки, навбар
- Glass: `rgba(255,255,255,0.05)` + `backdrop-blur(20px)`

### Акценты
- Cyan: `#06b6d4` — основной
- Blue: `#3b82f6` — вторичный
- Градиент: `linear-gradient(135deg, #06b6d4, #3b82f6)` — кнопки

### Типографика
- Inter — единый шрифт
- Заголовки: `tracking-tight`, `font-bold`, clamp sizing
- Описание: `text-slate-400`, `leading-relaxed`

### Границы
- `border-white/[0.08]` — тонкие полупрозрачные
- Hover: `border-white/[0.15]` + glow shadow

## Компоненты

### Navbar
- Sticky, frosted glass при скролле
- Логотип: SVG-иконка + "АВТО ЭЛЕКТРИК"
- Mobile: AnimatePresence оверлей с stagger-анимацией

### Hero
- Центрированный текст
- Glow orbs: три размытых цветных сферы (cyan/blue/purple)
- Subtle grid pattern: `radial-gradient` точки
- Shock-text: premium CSS glitch (не дешёвый)
- CTA: gradient button с glow shadow
- Stats: компактные, по центру

### Services
- Framer Motion: `useInView` + stagger
- Glass cards: `bg-white/5`, `backdrop-blur-md`
- SVG-иконки: кастомные, stroke-based
- Hover: border glow + card lift + "Подробнее" появляется

### Contacts
- Ambient glow фон
- Glass-кнопки с hover glow
- Animated presence для FAB

### FloatingContact
- Framer Motion: scale-in/out
- Rounded rectangles (14px radius)
- Telegram + Phone

### CustomCursor
- Lerp-based движение
- Dot + ring

## Стек
- React 19 + Vite 8
- Tailwind CSS 4
- Framer Motion 12
- GSAP (доступен, но не используется — FM покрывает)

## Файлы

| Файл | Строк |
|------|-------|
| `src/index.css` | ~280 |
| `src/App.jsx` | ~18 |
| `src/components/Navbar.jsx` | ~140 |
| `src/components/Hero.jsx` | ~130 |
| `src/components/Services.jsx` | ~130 |
| `src/components/Contacts.jsx` | ~100 |
| `src/components/Footer.jsx` | ~25 |
| `src/components/FloatingContact.jsx` | ~55 |
| `src/components/CustomCursor.jsx` | ~50 |
