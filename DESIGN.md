# DESIGN.md — Visual & Interaction System

Inspired by Vercel's design language, adapted for the sticky-note metaphor with a warm yellow accent. This document is the authoritative reference for any code-generating agent (human or AI) building UI in this project. **Read this before touching styling.**

---

## 1. Philosophy

- **Content first.** UI recedes; the note IS the hero.
- **Sharp & minimal.** No skeuomorphism. The brand metaphor (sticky note) shows through accent color + product imagery, NOT chrome.
- **Monochromatic foundation, yellow accent sparingly.** One ink color does 90% of the work; yellow signals interactivity + brand.
- **Motion is communication.** Animation only when it conveys state, never decoration.
- **Dark mode is first-class** — design both modes together, never one then the other.

## 2. Color Tokens

Use CSS variables in `src/styles/global.css`. Never hardcode hex in components.

| Token              | Light            | Dark             | Use                              |
|--------------------|------------------|------------------|----------------------------------|
| `--color-bg`             | `#ffffff`        | `#0a0a0a`        | Page background                  |
| `--color-bg-subtle`      | `#fafafa`        | `#111111`        | Cards, code blocks               |
| `--color-bg-muted`       | `#f4f4f5`        | `#1a1a1a`        | Hover, inputs                    |
| `--color-border`         | `#e5e5e5`        | `#262626`        | All borders                      |
| `--color-border-strong`  | `#d4d4d4`        | `#404040`        | Focus rings, dividers            |
| `--color-fg`             | `#0a0a0a`        | `#fafafa`        | Primary text                     |
| `--color-fg-muted`       | `#525252`        | `#a3a3a3`        | Secondary text                   |
| `--color-fg-subtle`      | `#737373`        | `#737373`        | Tertiary, captions               |
| `--color-accent`         | `#facc15` (yellow-400) | `#fde047` (yellow-300) | Links, primary CTAs, brand |
| `--color-accent-soft`    | `#fde68a`        | `#fef08a`        | Soft accent fills, hover halos   |
| `--color-success`        | `#16a34a`        | `#4ade80`        | Confirmations                    |
| `--color-warning`        | `#f5a623`        | `#f7b955`        | Warnings                         |
| `--color-danger`         | `#ee0000`        | `#ff4444`        | Errors, destructive              |

**Sticky-note brand colors** (used inside the notes app, NOT as theme accent):
- Yellow `#fde68a` · Pink `#fbcfe8` · Blue `#bfdbfe` · Green `#bbf7d0` · Lavender `#e9d5ff` · Orange `#fed7aa` · Mint `#a7f3d0` · White `#ffffff`

## 3. Typography

- **Font stack:** `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- **Mono:** `"JetBrains Mono", "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace`
- **Scale (rem):** 0.75 / 0.875 / 1 / 1.125 / 1.25 / 1.5 / 1.875 / 2.25 / 3 / 3.75 / 4.5
- **Weights:** 400 (body), 500 (UI labels), 600 (headings), 700 (hero)
- **Tracking:** Headings `-0.02em`, body `0`, small caps labels `0.06em`.
- **Leading:** Body `1.6`, headings `1.15`.

Hero headings allowed up to `5rem` on `>=1024px`. Always pair tight tracking with bold weight.

## 4. Spacing

4-pt base grid: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`.
Use Tailwind spacing utilities — do not invent custom margins.

## 5. Layout

- **Container:** max-width `1200px`, horizontal padding `24px` mobile / `48px` desktop.
- **Section vertical rhythm:** `py-20 md:py-32` for hero, `py-16 md:py-24` for content.
- **Grid:** prefer CSS grid with named tracks. Avoid nested flex chains.

## 6. Borders & Radius

- Default border: `1px solid var(--color-border)`.
- Radius scale: `4 / 6 / 8 / 12 / 16 / 24 / 9999` (pill).
- Cards: `radius-12`, surfaces: `radius-8`, buttons: `radius-8`, inputs: `radius-6`.
- **No drop shadows by default.** Use borders. Shadow only for floating overlays / sticky notes:
  - Light: `0 8px 24px rgb(0 0 0 / 0.08)`
  - Dark: `0 8px 32px rgb(0 0 0 / 0.5)`
  - Sticky-note card (slight 3D feel): `0 2px 6px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.04)`

## 7. Buttons

| Variant     | BG                  | FG          | Border           | Hover                  |
|-------------|---------------------|-------------|------------------|------------------------|
| Primary     | `--color-fg`        | `--color-bg`| none             | bg `--color-fg-muted`  |
| Secondary   | transparent         | `--color-fg`| `--color-border` | bg `--color-bg-muted`  |
| Ghost       | transparent         | `--color-fg`| none             | bg `--color-bg-muted`  |
| Accent      | `--color-accent`    | `#0a0a0a`   | none             | brightness `1.05`      |
| Destructive | `--color-danger`    | `#ffffff`   | none             | brightness `1.05`      |

Height `40px` default, `32px` small, `48px` large. Horizontal padding `16/12/20px`.
Focus ring: `0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent)`.

**Important:** Yellow accent contrast — keep FG on accent buttons BLACK (`#0a0a0a`) regardless of theme, not `--color-bg`. Yellow-on-white = unreadable.

## 8. Inputs

- Height `40px`, padding `0 12px`, radius `6`, border `1px var(--color-border)`.
- Background `var(--color-bg)`. Placeholder color `var(--color-fg-subtle)`.
- Focus: border `var(--color-accent)`, ring as buttons.

## 9. Motion

- **Durations:** `120ms` (state), `200ms` (transition), `400ms` (entry).
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo) for entries; `ease-out` for state.
- Hover transitions: opacity, background, border only. **Never** width/height.
- Respect `prefers-reduced-motion` — disable all non-essential motion (already gated in `global.css`).

## 10. Iconography

- Use **Lucide** icons via inline SVG paths embedded in component data.
- Stroke `1.75px`, size `16/20/24`.
- Color inherits from text. No filled icons unless conveying state.
- Pattern reference: see `inline-svg-icon-chips` skill or FTN's `index.astro` feature grid.

## 11. Imagery

- No stock photos. Use abstract geometric or product screenshots.
- All images lazy-loaded (`loading="lazy"`) except above-the-fold.
- Always provide `width` + `height` to prevent CLS.

## 12. SEO & Semantic Defaults

- One `<h1>` per page. Sections use `<h2>`/`<h3>`.
- All interactive elements need accessible names (aria-label, button text).
- Page title format: `<page-title> · <site.name>` for sub-pages, `<site.name> · <tagline>` for index.
- Every page has `<title>`, `<meta description>`, OG tags, canonical (handled in `Layout.astro`).

## 13. Brand metaphor — visual hooks

- **The sticky note shape**: 4:5 aspect, slight 1-3° rotation, optional top-strip "tape" simulated with a darker accent band 8px tall.
- **The floating window**: drawn as a smaller card "lifted off" the page via shadow + slight offset transform.
- **Pin / push-pin icon**: signals the floating / always-on-top concept. Lucide `pin` (rotated 30°) or `pin-off`.

These show up in the hero, mechanism-animation, and OG card. Don't overuse — the design is otherwise monochromatic.

## 14. Anti-patterns (don't)

- ❌ Hardcode hex in components — always use CSS variables
- ❌ Use the yellow accent on white text — readability disaster
- ❌ Drop shadows on UI chrome (only on the sticky-note brand metaphor + PiP overlays)
- ❌ Skeuomorphic sticky-note 3D effects (paper texture, curling corners) — modern + minimal wins
- ❌ Multiple H1s per page (SEO penalty)
- ❌ Custom margin values outside the spacing scale
