# Task 006: Layout Rebalance (Hero & Services)

## Context
You are supervised by the Senior Architect. We looked at the full scroll of the site. The top of the site (Hero) is an empty black void, while the bottom (Services) is overloaded and stretched out.

## Tasks

### 1. Fix the Empty Hero Section (`Hero.jsx`)
**Bug**: The Hero is completely empty. The glowing title is in the wrong component!
**Fix**:
- **Move the Title**: You MUST move the massive "УСЛУГИ АВТОЭЛЕКТРИКА" text (with the electric shock effect) OUT of `Services.jsx` and INTO `Hero.jsx`. It must be the main `H1` at the very top of the page.
- **Add the Button**: Add a primary Call to Action button ("Связаться с мастером") inside `Hero.jsx`, right below the paragraph text.
- **Layout**: Center these 3 elements (Title -> Paragraph -> Button) with `flex-col`, `items-center`, `justify-center`, and `min-h-[80vh]` so the first screen is fully populated and impactful.

### 2. Compact the Services Section (`Services.jsx`)
**Bug**: The services list is extremely long, vertically stretched, and visually heavy on mobile.
**Fix**:
- **New Header**: Since you moved the main title to the Hero, give this section a smaller, cleaner header like "МОИ УСЛУГИ" (with the M-Tricolor accent).
- **Compact Cards**: Reduce the vertical padding inside the service cards. Make the icons smaller. 
- **Grid Layout**: On mobile, keep it 1 column but make the cards much tighter. On desktop/tablet, ensure it uses a grid (`grid-cols-2` or `grid-cols-3`) so it doesn't create an infinite vertical scroll. 

## Output
Re-write `Hero.jsx` and `Services.jsx` to perfectly balance the layout. The top should be loud and clear, the bottom should be compact and easy to read. Write `.mimo_workflow/006_report.md` when done.
