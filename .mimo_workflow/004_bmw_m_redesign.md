# Task 004: Build from Scratch - BMW M Theme

## Context
We are discarding the previous codebase and writing the React/Vite site from scratch. You must build a highly aggressive, automotive-themed Landing Page for an Auto Electrician based on the `DESIGN.md` guidelines (BMW M style).

## Strict Requirements
1. **Design System**: Read and strictly apply the `DESIGN.md` file found in the root. Use the pure black background and the M Tricolor (Light Blue `#33a0d1`, Dark Blue `#373485`, Red `#c52b30`) for accents, gradients, or button borders.
2. **Sharp Geometry**: Use brutalist, sharp corners (no heavy border-radius) to mimic automotive engineering.

## Crucial Features to Preserve
Even though we are building from scratch, you **MUST** re-implement these specific features from our past iterations:
1. **The "Electric Shock" Text Effect**: The word "ЭЛЕКТРИК" must look like it's being struck by high voltage (flickering `text-shadow`, glitch, or SVG `feTurbulence` filter).
2. **Interactive SVG Hero Graphic**: Create an impressive, technical SVG graphic on the first screen (e.g., car schematics, glowing rings, lightning traces).
3. **Floating Contacts**: Implement a floating action button in the bottom corner with links to Phone (`+7 996 031 4637`) and Telegram (`@DemonMSB`).
4. **Mobile Menu**: Include a responsive, full-screen mobile menu with a hamburger toggle that animates into an X.

## Output
Rebuild the site components (`Hero`, `Services`, `Contacts`, `Navbar`, etc.) in the `src/` folder. Use Tailwind CSS. When done, write a report in `.mimo_workflow/004_report.md`.
