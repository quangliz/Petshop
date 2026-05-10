---
name: Bold & Clean
colors:
  # Surface tones — clean white system (Vinamilk-inspired)
  surface: '#ffffff'
  surface-dim: '#dcdde1'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f5f7'
  surface-container: '#eeeeef'
  surface-container-high: '#e6e6e8'
  surface-container-highest: '#dcdde1'
  on-surface: '#1a1a1a'
  on-surface-variant: '#44444a'
  inverse-surface: '#1a1a1a'
  inverse-on-surface: '#f5f5f5'
  outline: '#76767a'
  outline-variant: '#c4c4c8'
  surface-tint: '#f06b00'

  # Primary — brand orange
  primary: '#f06b00'
  on-primary: '#ffffff'
  primary-container: '#3d1c00'
  on-primary-container: '#ffb87d'
  inverse-primary: '#f06b00'
  primary-fixed: '#ffe0c8'
  primary-fixed-dim: '#ffb87d'
  on-primary-fixed: '#2d1000'
  on-primary-fixed-variant: '#b84f00'

  # Secondary — deep charcoal for dark sections (announcement bar, footer, CTA banners)
  secondary: '#1a1a1a'
  on-secondary: '#ffffff'
  secondary-container: '#2d2d2d'
  on-secondary-container: '#b0b0b0'
  secondary-fixed: '#e5e5e5'
  secondary-fixed-dim: '#c8c8c8'
  on-secondary-fixed: '#111111'
  on-secondary-fixed-variant: '#444444'

  # Tertiary — teal, reserved for AI-driven features only
  tertiary: '#006d60'
  on-tertiary: '#ffffff'
  tertiary-container: '#00201b'
  on-tertiary-container: '#7af5e4'
  tertiary-fixed: '#c8f5ec'
  tertiary-fixed-dim: '#7af5e4'
  on-tertiary-fixed: '#002019'
  on-tertiary-fixed-variant: '#005249'

  # Semantic
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'

  # Background
  background: '#ffffff'
  on-background: '#1a1a1a'
  surface-variant: '#dcdde1'

typography:
  # VNMMono is the display face — uppercase bold section titles, hero text, banner headings
  display:
    fontFamily: VNMMono
    fontSize: 64px
    fontWeight: '900'
    lineHeight: '0.95'
    letterSpacing: '-0.01em'
    textTransform: uppercase
  headline-xl:
    fontFamily: VNMMono
    fontSize: 48px
    fontWeight: '900'
    lineHeight: '1.0'
    letterSpacing: '-0.01em'
    textTransform: uppercase
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.15'
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.25'
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  # Labels are uppercase, wide-tracked, semi-bold — used for section eyebrows and badges
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.08em
    textTransform: uppercase
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.14em
    textTransform: uppercase

rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px

spacing:
  base: 8px
  gutter: 24px
  margin: 32px
  container-max: 1400px
---

## Brand & Style

**ThePawsome** adopts a **bold, clean retail aesthetic** — inspired by the high-impact visual language of leading Vietnamese consumer brands. The interface is direct, confident, and energetic: large type, strong contrast, and a vivid brand orange that commands attention without visual clutter.

The aesthetic is **"Bold & Clean"**: pure white surfaces with high-contrast typography and bold orange accents. Every section is visually distinct, purposeful, and scannable. Warmth comes from the orange palette, not from textured or off-white backgrounds.

---

## Colors

### Primary — Brand Orange `#f06b00`

The single most important color in the system. Used on:
- Primary action buttons and CTAs
- Sale/promo badges
- Section eyebrow labels
- Active nav indicators
- Icon fills on key interactions

The orange is warm, vivid, and high-energy — appropriate for a retail brand that wants to drive purchase intent. `on-primary` is always pure white for maximum contrast.

### Secondary — Deep Charcoal `#1a1a1a`

Used for all dark-mode surface areas: the announcement bar, promotional CTA banners, footer, and dark-on-light heading emphasis. Pairing charcoal with pure white and brand orange creates a three-tone palette that feels premium and intentional rather than flat.

### Tertiary — Teal `#006d60`

Reserved exclusively for AI-powered features (the chat widget, AI product recommendations, smart search suggestions). Teal serves as a clear semantic signal: "this is the AI assistant." It should not appear in regular commerce UI.

### Surfaces — Clean White System

All surfaces use pure white (`#ffffff`) or near-white grays (`#f5f5f7`, `#eeeeef`). There are no warm cream tints in the surface palette. This maximises contrast with product photography and text, and matches the clean, editorial feel of the reference aesthetic.

### Semantic Colors

Standard error red, unchanged. There are no custom warning or success tones beyond what is inherited from the base palette.

---

## Typography

Two typefaces in total. No more.

### VNMMono — Display & Section Titles

VNMMono (local, `--font-vnmmono`) is the **display face** for everything above the fold and for section headings. It is used **uppercase only**, at heavy weights. Its monospaced, condensed character gives the interface its distinctive voice — bold and slightly industrial, referencing the chunky display lettering common in Vietnamese retail branding.

Use cases:
- Hero banner headings on `BannerCarousel`
- Homepage section titles (`BÁN CHẠY TUẦN NÀY`, `MỚI VỀ TUẦN NÀY`)
- CTA block headings
- Page `<h1>` elements on marketing pages

**Never** use VNMMono at weights below 700 or in body copy.

### Be Vietnam Pro — Body & UI

Be Vietnam Pro (Google Fonts, `--font-be-vietnam`) handles all body copy, UI labels, form fields, product names, prices, and navigation. It is highly legible at small sizes and carries the Vietnamese diacritics well.

Weight usage:
- `400` — body copy, descriptions
- `600` — UI labels, nav items, secondary buttons
- `700`–`800` — product prices, card titles, sub-headings
- `900` never used (VNMMono handles extreme weights)

### Labels & Eyebrows

Section eyebrows (the small uppercase text above a `<h2>`) use `label-sm`: 11px, 700 weight, 0.14em letter-spacing, uppercase. They are colored in `primary` (`#f06b00`) and function as a visual prelude that contextualises the bold heading below.

---

## Layout & Spacing

### Container

Max content width is **1400px** with `px-5 md:px-14` horizontal padding on page sections. This is wider than the previous 1280px to allow more generous product carousels and richer banner content.

### Full-Bleed Sections

Hero banners and dark CTA blocks span the **full viewport width** — no horizontal margins, no border-radius. This is a deliberate departure from the previous card-style banners and directly mirrors the Vinamilk reference: wide, immersive, editorial.

### Section Rhythm

A consistent vertical rhythm governs the page:
- `pt-12 md:pt-16` between sections
- `mb-5 md:mb-7` between the section header and its content
- Sections are separated by content density and background color, not by explicit dividers

### Grid & Carousel

Product carousels use horizontal scroll snap with `gap-3 md:gap-4` between cards. On desktop, prev/next arrow buttons appear outside the scroll container (`-left-5` / `-right-5`), keeping the card area unobstructed.

---

## Elevation & Depth

The system is predominantly **flat with purposeful shadows**.

- **Cards at rest:** `border border-neutral-100` only — no shadow. Keeps the white-on-white surface clean.
- **Cards on hover:** `hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]` + `hover:-translate-y-1`. The lift is the primary affordance that something is interactive.
- **Dropdowns / overlays:** `shadow-lg` (`0 10px 15px rgba(0,0,0,0.1)`) for search suggestion panel and dropdown menus.
- **No glow effects** outside of focus accessibility states.

Depth in the layout is created through **background contrast** (white cards on `#f5f5f7` page background, or white sections against the dark charcoal CTA block), not through stacked shadows.

---

## Shapes

- **Buttons (primary actions):** `rounded-full` (pill). Bold, pill-shaped CTAs are the clearest visual cue for "buy" actions.
- **Buttons (secondary / ghost):** `rounded-xl` (12px). Slightly softer than pill; used for filter chips, secondary nav actions.
- **Product cards:** `rounded-2xl` (16px). Generous corners that feel modern and friendly.
- **Input fields / search bar:** `rounded-xl` (12px) to match secondary buttons.
- **Banner carousel:** `rounded-none` — fully rectangular, full-bleed. No softening on the primary hero.
- **Carousel dot indicators:** active dot `rounded-full` + wider (pill shape, `w-6 h-2`); inactive dots `w-2 h-2 rounded-full`.
- **Tags / badges:** `rounded-full` always.

---

## Components

### Announcement Bar

A full-width `bg-[secondary]` (`#1a1a1a`) strip above the sticky header. 11px font, `font-semibold`, `tracking-wide`. Left: shipping offer. Right (desktop only): supporting links. On mobile, only the primary message shows, centred.

### Header

Sticky (`top-0 z-20`), white background with `backdrop-blur-md` and a single `border-b` divider. Three zones:
1. **Left:** Logo (`BrandLogo`) + desktop nav links
2. **Centre:** Search form (desktop, `max-w-[420px]`, grows to fill available space)
3. **Right:** Mobile search toggle, cart icon with badge, desktop auth section, mobile hamburger

Mobile hamburger opens a right-slide drawer with full nav, cart count, and auth section.

### Section Headers

Each product section uses a two-line header:
- Line 1: `label-sm` eyebrow in `primary` (`#f06b00`) — e.g. "ThePawsome Store"
- Line 2: VNMMono `headline-xl` uppercase — e.g. "BÁN CHẠY TUẦN NÀY"
- Optional line 3: `body-md` subtitle in `on-surface-variant`
- Right-aligned "Xem tất cả →" in `on-surface-variant`, uppercase, `font-bold`

### Product Cards

White `rounded-2xl` with `border border-neutral-100`. Three layers:
1. **Image area:** `aspect-square`, `object-cover`, scale-on-hover. Sale badge `rounded-full` in `primary`.
2. **Brand label:** 9px, 700 weight, uppercase, `on-surface-variant` (very muted).
3. **Name:** 12–13px, `font-bold`, `line-clamp-2`, `min-h-[2.4rem]` to prevent layout shift.
4. **Price row:** Sale price in `primary` at 14–15px `font-extrabold`; original price struck-through in `outline-variant`.

### Dark CTA Banner

Full-width (within `mx-5 md:mx-14` margins), `rounded-2xl`, `bg-[secondary]` (`#1a1a1a`). VNMMono heading in white. Subtext in `on-secondary-container`. White pill button at right (desktop) or below (mobile). Used once per page, at the bottom of the homepage, to close the scroll with a brand statement.

### Buttons

| Variant | Background | Text | Radius |
|---|---|---|---|
| Primary | `#f06b00` | white | `rounded-full` |
| Primary hover | `#cc5a00` (darken 10%) | white | `rounded-full` |
| Secondary / Outline | white | `#1a1a1a` | `rounded-full` |
| Ghost | transparent | `#44444a` | `rounded-xl` |
| Dark (on dark bg) | white | `#1a1a1a` | `rounded-full` |
| AI / Teal | `#006d60` | white | `rounded-full` |

### Badges

| Type | Background | Text |
|---|---|---|
| Sale | `#f06b00` | white |
| New | `#e6f4ea` | `#1a6632` |
| AI | `#e0f5f2` | `#006d60` |

---

## Motion

- **Card hover lift:** `transition-all duration-200`, `hover:-translate-y-1`
- **Banner slide transition:** `transition-opacity duration-700` between slides
- **Dropdown / overlay entry:** `animate-in fade-in` from `tailwindcss-animate`
- **Mobile drawer:** slide in from right, backdrop fade
- No bounce, spring, or decorative animations — motion is purely functional and fast.
