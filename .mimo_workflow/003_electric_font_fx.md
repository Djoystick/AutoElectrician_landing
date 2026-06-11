# Task 003: Electric Typography & Text Effects

## Context
You are supervised by the Senior Architect. The current Hero section is good, but the typography feels a bit too "static" and "dead". We need to inject life and energy into it.

## Tasks

### 1. Typography Upgrade
**Bug**: The font feels too standard. 
**Fix**: 
- Adjust the typography of the main `H1` title. Make it bolder, perhaps using an italicized or more aggressive technical font style for the heading (e.g., a display font).

### 2. The "Electric Shock" Effect
**Target**: The word "ЭЛЕКТРИК" (or the whole title, but emphasizing "ЭЛЕКТРИК").
**Bug**: It lacks a thematic "wow" factor.
**Fix**: 
- Add a custom CSS animation or SVG filter to make the word "ЭЛЕКТРИК" look like it is **being struck by electricity or sparking**.
- **Implementation ideas**: 
  - A fast, randomized `text-shadow` flicker (neon glitch effect).
  - An SVG `feTurbulence` filter applied to the text to create a physical static/distortion wave that triggers occasionally.
  - A glowing stroke animation that traces the letters.
- The effect shouldn't be annoying to read, but it should clearly say "high voltage".

## Output
Apply the effects, ensure the CSS is performant, and write a brief summary in `.mimo_workflow/003_report.md`.
