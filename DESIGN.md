---
name: ThePawsome
colors:
  primary: "oklch(0.68 0.19 50)"
  on-primary: "#ffffff"
  primary-container: "oklch(0.97 0.03 55)"
  on-primary-container: "oklch(0.42 0.14 40)"
  secondary: "oklch(0.54 0.12 192)"
  on-secondary: "#ffffff"
  secondary-container: "oklch(0.96 0.03 195)"
  on-secondary-container: "oklch(0.46 0.11 192)"
  tertiary: "oklch(0.75 0.15 75)"
  on-tertiary: "#1a1814"
  tertiary-container: "oklch(0.95 0.05 75)"
  on-tertiary-container: "oklch(0.75 0.15 75)"
  error: "oklch(0.58 0.19 25)"
  on-error: "#ffffff"
  error-container: "oklch(0.95 0.05 25)"
  on-error-container: "oklch(0.58 0.19 25)"
  success: "oklch(0.64 0.14 150)"
  on-success: "#ffffff"
  success-container: "oklch(0.95 0.05 150)"
  on-success-container: "oklch(0.64 0.14 150)"
  background: "#faf7f2"
  on-background: "#2a2620"
  surface: "#ffffff"
  on-surface: "#1a1814"
  surface-variant: "#fdfbf7"
  on-surface-variant: "#5f5749"
  outline: "#e9e2d5"
  outline-variant: "#d8cfbf"
typography:
  btn:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: "600"
    letterSpacing: -0.005em
  btn-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 15px
    fontWeight: "600"
  btn-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    fontWeight: "600"
  badge:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: "600"
    letterSpacing: 0.01em
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
components:
  btn-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 10px 18px
    typography: "{typography.btn}"
  btn-primary-hover:
    backgroundColor: "oklch(0.61 0.19 46)"
  btn-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-background}"
    rounded: "{rounded.full}"
    padding: 10px 18px
    typography: "{typography.btn}"
  btn-outline-hover:
    backgroundColor: "{colors.surface-variant}"
  btn-ghost:
    backgroundColor: transparent
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.btn}"
  btn-ghost-hover:
    backgroundColor: "#f4efe7"
  btn-teal:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.full}"
    typography: "{typography.btn}"
  btn-teal-hover:
    backgroundColor: "oklch(0.46 0.11 192)"
  badge-sale:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 3px 10px
    typography: "{typography.badge}"
  badge-ai:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    rounded: "{rounded.full}"
    padding: 3px 10px
    typography: "{typography.badge}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
---

## Brand & Style

**ThePawsome** balances the warm, playful energy of pet care with the high-tech reliability of artificial intelligence. The interface is clean, soft, and inviting, ensuring that the technology feels human-centric and accessible.

The aesthetic leverages a **"Refined Warmth"** approach, characterized by a predominantly warm neutral background that evokes comfort, punctuated by vibrant accents. The use of pill-shaped buttons and generous border radii further reinforces the approachable nature of the brand.

## Colors

The color palette is built on OKLCH to provide perceptual uniformity, ensuring smooth gradients and consistent contrast across the UI.

- **Primary (Warm Orange):** The core brand color (`oklch(0.68 0.19 50)`) drives main actions, sale badges, and primary highlights. It conveys energy and enthusiasm.
- **Secondary (Teal / AI Accent):** A cool, modern teal (`oklch(0.54 0.12 192)`) serves as a counterpoint to the warm orange. It is used specifically to denote AI-driven features and insights.
- **Warm Neutrals:** Instead of stark whites and cool grays, the backgrounds use a creamy, warm neutral palette (e.g., `#faf7f2` for the main background). This reduces eye strain and feels more organic.

## Typography

**Be Vietnam Pro** is the primary typeface. It is highly legible with a slightly extended structure, making it modern yet friendly.

- **Weights:** Semi-bold (`600`) is used heavily for UI elements like buttons and badges to ensure they punch through the soft backgrounds.
- **Letter Spacing:** Subtle tight letter spacing (`-0.005em`) is applied to buttons to give them a compact, intentional feel, while badges use loose spacing (`0.01em`) for uppercase legibility at small sizes.

## Layout & Spacing

The design avoids harsh lines and cramped interfaces. 
- Elements are spaced comfortably to let the warm backgrounds breathe.
- The use of soft borders (`1px solid var(--neutral-100)`) instead of heavy dividing lines maintains the "soft" aesthetic.

## Elevation & Depth

Depth is established primarily through soft, layered shadows rather than borders.

- **Shadows:** The shadow system mixes the dark neutral color (`#423c33`) with very low opacity to create "warm" shadows instead of standard black.
- **Interactions:** Interactive elements like primary buttons feature a subtle lift (`translateY(-1px)`) combined with an increased shadow to provide satisfying tactile feedback.
- **Glows:** A primary-colored glow is available for focus states to maintain the brand presence even in accessibility contexts.

## Shapes

Shapes are universally friendly and organic.

- **Pill Shapes:** Buttons (`btn`) and badges (`badge`) use a `9999px` radius to feel fully rounded and pill-like, differentiating them as the primary interactive and labeling elements.
- **Cards:** Content containers use `16px` (`lg`) corners, providing a contained but distinctly soft edge that matches the playful brand tone.

## Components

### Buttons
Buttons are designed with a tight, pill-shaped profile and robust semi-bold text. Primary buttons carry the brand's energetic orange, while secondary "Teal" buttons are reserved for AI-related actions. Ghost and outline variants are used for secondary actions to reduce visual noise.

### Badges
Badges are tiny, highly-legible pill shapes used for status, sales, or AI indicators. The `badge-ai` specifically pairs the teal background tint with a teal border to pop against the warm neutral cards.

### Cards
Cards sit on the warm neutral background with a stark white surface to create contrast and hierarchy. They use the `shadow-sm` and a subtle `neutral-100` border to softly separate content.
