# AGENTS.md — Rules for AI agents working on this repo

This project is built **by AI agents** (Hermes / JARVIS) for Shrestha Tripathi.
Follow these rules on every change.

## Stack

- **Astro 6** (MPA, SEO-first static output) + **TypeScript strict**
- **Tailwind CSS v4** (zero-config, `@theme` in `src/styles/global.css`)
- **Cloudflare Pages** deploy target (static, auto from `main` push)
- **Tiptap v3** editor + extensions (Phase 2+, vanilla `@tiptap/core` — NO React)
- **Document Picture-in-Picture API** for floating window (Phase 3)
- **IndexedDB** (via `idb`) for note storage — primary, behind a `StorageAdapter`
  interface so OPFS / sqlite-wasm can be dropped in later without touching the
  store. (Decision recorded in `specs/SPEC-Phase2.md` §0.)
- **BroadcastChannel** for cross-tab sync (Phase 2+)
- Node `>=22.12.0`, npm

## Mandatory skills (load before coding)

When editing this repo, load these skills via `skill_view`:

1. **`livecaptionit-project`** — sibling Document PiP project, patterns to reuse
2. **`p2pdatasharing-project`** — FTN, same stack DNA + brand discipline
3. **`document-pip-app-shell-relocation`** — the proven PiP wholesale-relocation pattern
4. **`astro-microtool-scaffold`** — scaffold conventions
5. **`inline-svg-icon-chips`** — icon chip pattern (no icon library)
6. **`themed-svg-diagrams`** — for MechanismAnimation
7. **`tailwind-v4-dark-variant-data-theme`** — Tailwind v4 dark mode gotcha
8. **`astro-google-analytics-4`** — GA4 wiring

Also read **`DESIGN.md`** before any UI work. It is the visual contract.

## Brand-name discipline

- Domain finalized as `alwaysontopnotes.com` (bought 2026-06-13).
- **Never hardcode the brand string** in source files — always import from
  `src/site.config.ts`.
- All user-facing brand strings (`name`, `domain`, `tagline`, `description`)
  come from `site.config.ts`, overridable via `PUBLIC_SITE_*` env vars.
- When rebranding, edit `.env` only. No code changes.

## SEO non-negotiables

- One `<h1>` per page.
- Every page has `<title>`, `<meta description>`, OG tags, canonical
  (handled by `Layout.astro`).
- Use MPA: separate `.astro` page per route. No SPA routing.
- FAQ pages must include JSON-LD `FAQPage` schema.
- Index page must include JSON-LD `SoftwareApplication` schema.
- Lazy-load below-the-fold images, always set `width`/`height`.

## Code conventions

- Components: PascalCase `.astro` in `src/components/`.
- Pages: kebab-case in `src/pages/` (e.g. `privacy-policy.astro`).
- Client-side TS: ES modules, no global script tags. Use `<script>` blocks
  with imports — Astro bundles them.
- No hex colors in components — use CSS variables from `global.css`.
- Tailwind utilities preferred over custom CSS.
- Strict TypeScript — fix all `tsc --noEmit` errors before commit.
- One feature = one commit (rollback-friendly).

## Required pages (add as the project grows)

`/`, `/app`, `/how-it-works`, `/compare`, `/faq`, `/install`, `/about`,
`/contact`, `/privacy-policy`, `/terms`, `/404`, plus `sitemap.xml` and
`robots.txt`.

## Privacy-claim discipline (HARD RULE — do not revert)

The moat is **PRODUCT DATA**, not analytics.

- ✅ ALWAYS TRUE, keep prominent: *your notes never leave your device* — notes
  live in browser local storage / IndexedDB, never on our infrastructure, and
  no code path uploads or reads note content.
- ❌ NEVER write "no tracking", "zero tracking", "no analytics", "cookieless",
  "no cookies", or "no ads" in user-facing copy. The site runs a **live GA4
  property** (`gaId` in `src/site.config.ts`) and is **AdSense-ready** — those
  claims are false and are an AdSense policy risk.
- Correct framing: notes are private to the device; the *website* uses
  anonymous analytics and may show ads. Confident, not apologetic.
- `/privacy-policy` must keep its AdSense + **DART cookie** paragraph with the
  opt-out links (`google.com/settings/ads`, `aboutads.info/choices`).

Before commit: `grep -rniE 'no tracking|no analytics|cookieless|no ads' src/`
must return nothing contradictory.

## Verify before commit

```bash
npm run build       # must succeed
npx astro check     # type + Astro diagnostics
```

## Deploy target reminder

Cloudflare Pages, static output. `public/_headers` marks `*.pages.dev` as
noindex (use `cloudflare-pages-noindex-headers` skill once domain is connected).

## Document PiP scope (Phase 3+)

- Desktop Chromium-only (Chrome/Edge 116+).
- Feature-detect with `isPipSupported()` — silently hide button on
  unsupported browsers, do NOT show broken UX.
- MUST follow the wholesale-relocation pattern from
  `document-pip-app-shell-relocation` skill: move the `<main>` ELEMENT
  itself (not children) for CSS scoping correctness.
- Reuse `src/lib/pipWindow.ts` and `src/lib/pipTour.ts` from FTN — both
  exist battle-tested in `~/projects/p2pdatesharing/`.
