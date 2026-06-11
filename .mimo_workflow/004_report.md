# Отчёт: Задание 004 — BMW M Redesign (с чистого листа)

## Дата: 2025-06-11

## Концепция

Полная пересборка сайта с нуля на чистом React/Vite/Tailwind. Дизайн-система строго по `DESIGN.md`: чисто чёрный фон, M-триколор (`#33a0d1`, `#373485`, `#c52b30`), жёсткая геометрия без скруглений.

## Дизайн-система

### Цвета
- **Фон**: `#000000` — чистый чёрный
- **M-синий светлый**: `#33a0d1` — основной акцент
- **M-синий тёмный**: `#373485` — вторичный
- **M-красный**: `#c52b30` — третичный
- **Текст**: `#ffffff` (primary), `#a0a0a0` (secondary), `#555555` (muted)

### Геометрия
- Все углы `0px border-radius` — брутализм
- Карточки: прямоугольные, с top-border анимацией (M-триколор полоса)
- Кнопки: прямоугольные, без скруглений
- Разделители: M-триколор полоса 3px

### Шрифты
- Display: Space Grotesk (aggressive uppercase)
- Body: Inter

## Реализованные фичи

### 1. Electric Shock Text
- CSS-анимация `shockFlicker` — мерцание с clip-path (верх/низ)
- Слои: основной текст + `::before` (синий) + `::after` (красный)
- `shock-glow` — пульсирующий text-shadow

### 2. SVG Hero Graphic
- Три вращающихся кольца (синий/синий-тёмный/красный)
- Circuit traces с анимацией drawing
- Пульсирующие узлы на трассах
- Центральный M-бейдж
- Молния с glow-эффектом и flicker-анимацией
- Плавающий drift через GSAP

### 3. Floating Contact
- Фиксированные кнопки в правом нижнем углу
- Telegram (синий) и Телефон (белый)
- Появляются при скролле >400px
- M-триколор полоса при наведении
- GSAP elastic появление

### 4. Mobile Menu
- Бургер → крестик (CSS transitions)
- Полноэкранный оверлей (black/95 + blur)
- M-триколор полоса декор
- Навигация + CTA + Telegram
- GSAP stagger анимация ссылок
- Блокировка скролла body

### 5. M-Stripe
- Горизонтальная полоса 3px: Light Blue → Dark Blue → Red
- Используется как разделитель, border hero, декор

## Компоненты

| Компонент | Описание |
|-----------|----------|
| `Navbar` | Навигация + мобильное меню с анимацией |
| `Hero` | Заголовок с shock-text, SVG-графика, CTA, статистика |
| `Services` | Сетка карточек с M-анимацией, ScrollTrigger |
| `Contacts` | Контактные кнопки с M-триколор hover |
| `Footer` | Минималистичный футер |
| `FloatingContact` | Плавающие FAB-кнопки |
| `CustomCursor` | Кастомный курсор (точка + кольцо) |

## Файлы

| Файл | Строк |
|------|-------|
| `src/index.css` | ~500 (design system + all styles) |
| `src/App.jsx` | ~20 |
| `src/components/Navbar.jsx` | ~120 |
| `src/components/Hero.jsx` | ~170 |
| `src/components/Services.jsx` | ~110 |
| `src/components/Contacts.jsx` | ~100 |
| `src/components/Footer.jsx` | ~20 |
| `src/components/FloatingContact.jsx` | ~50 |
| `src/components/CustomCursor.jsx` | ~50 |
