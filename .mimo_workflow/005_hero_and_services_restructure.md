# Task 005: Hero Section Restructure & Services Upgrade

## Context
You are supervised by the Senior Architect. The previous BMW M design implementation is technically correct, but the UX and content layout are poor. The first screen is stretched, empty, and boring. The site needs to "SCREAM" high quality, speed, and fairness.

## Tasks

### 1. Hero Section Overhaul (`Hero.jsx`)
**Bug**: The first screen is too empty, the main title is pushed down below the fold, and the giant lightning bolt SVG is unwanted. The header "АВТО М ЭЛЕКТРИК" is dry.
**Fix**:
- **Remove the Header Title**: Remove the dry "АВТО М ЭЛЕКТРИК" from the top header.
- **Move the Main Title Up**: Take the huge "УСЛУГИ АВТОЭЛЕКТРИКА" text (the one with the electric shock/glitch effect) and make it the **primary H1 at the very top of the Hero section**.
- **Remove Junk**: Delete the giant lightning bolt SVG from the background. Delete the tiny "ПРОФЕССИОНАЛЬНЫЙ АВТОЭЛЕКТРИК" badge.
- **Update the Copy**: The text under the main title MUST aggressively sell the service. Use this exact message:
  > "Быстро. Точно. Надёжно. Берем деньги только за проделанную работу и результат, а не за предположения."
- **Layout**: Make the Hero section compact. There should be NO massive empty gaps. Place a bright, glowing Call to Action button ("Связаться с мастером") right below the text, immediately visible without scrolling.

### 2. Services Section Upgrade (`Services.jsx`)
**Bug**: The text in the services section looks accidental, and the cards are too basic and "dead".
**Fix**:
- **Redesign the Cards**: Make the service cards organic and premium. They should look like high-end tech/automotive UI components.
- **Add Hover States**: When a user hovers over a card, the border should glow with the M-Tricolor gradient, the card should slightly lift, and the icon should pulse.
- **Better Typography**: Increase the font size and contrast of the service descriptions so they don't look like accidental small text. Ensure the layout is a clean grid (1 column on mobile, 2/3 on desktop).

## Output
Re-write `Hero.jsx`, `Services.jsx`, and `Navbar.jsx` (to remove the title). Ensure the site looks dense, premium, and aggressive. Write `.mimo_workflow/005_report.md` when done.
