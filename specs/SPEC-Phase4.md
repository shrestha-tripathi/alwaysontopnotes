# SPEC — Phase 4 (Polish · PWA · Ship)

> **Status:** approved 2026-06-14. The 4-commit ship phase. One feature = one
> commit; user advances per-commit with "next". This doc is the contract.

## Why this is a re-spec (not the raw v0.1 roadmap)

Recon on the live repo found the original 4-row Phase-4 table is **partly already
shipped** and references **two missing files that 404 in production**:

| v0.1 said | Reality on `main` |
|---|---|
| commit 17: shortcuts cheatsheet + dark toggle | cheatsheet **already shipped** (commit 11) — only the toggle remains |
| commit 18: wire GA4 `G-Q1Y0YHLJ8K` | GA4 **already wired** in `Layout.astro` |
| commit 16: PWA | `<link rel="manifest">` is in `Layout.astro` but **`/manifest.webmanifest` does not exist → 404 every page** |
| commit 18: OG image | `og:image` → `/og-image.png` **does not exist → broken share card** everywhere |
| sitemap | lists `/app` at priority 0.9, but `/app` is `noindex` → self-contradiction |

So Phase 4 = **3 net-new features + a cluster of ship-blocking fixes**, repackaged
into 4 atomic commits.

## Decisions (approved as-is)

- **A — Tiptap⇄Markdown = hand-rolled** (override of the usual "use a lib" rule).
  Justified ONLY because our schema is small + FROZEN. Vanilla-Tiptap-v3 MD libs
  are React-coupled / immature; a ~150-LOC serializer+parser for our exact node
  set gives a perfect round-trip, zero deps. Zip half uses **`client-zip`** (tiny,
  streaming, MIT — settled).
- **B — Service worker = real offline app-shell precache** (NOT install-only).
  AOTN is the opposite of the skill's WebGPU/permission default: an IndexedDB
  notes app that's genuinely useful with no network, and "always visible while
  you work" *wants* to survive dead wifi.
- **C — Theme toggle = compact sun/moon/system button in the header** (one click,
  discoverable), cycling dark → light → system, persisted to `aotn:theme`.

## The frozen editor schema (the MD converter's exact scope)

From `src/lib/tiptapSetup.ts` — StarterKit v3 + TaskList/TaskItem + TextStyle +
Color + Typography. The converter MUST handle exactly:

**Blocks:** `paragraph` · `heading` (1-6) · `bulletList>listItem` ·
`orderedList>listItem` · `taskList>taskItem{checked}` · `blockquote` ·
`codeBlock{language}` · `horizontalRule` · `hardBreak`
**Marks:** `bold` · `italic` · `strike` · `code` (inline) · `link{href}`

**Lossy-on-export (documented, acceptable):** `underline` and `textStyle/color`
have no clean Markdown representation → export drops the mark, keeps the text.
(Round-trip note: bold/italic/lists/tasks/headings/code/links/quotes are lossless.)

---

## Commit 15 — `feat(notes): Markdown export + import`

**Goal:** get notes OUT (and back IN) as portable `.md`, so AOTN isn't a roach
motel. Reinforces "your data, your device."

**New files**
- `src/lib/markdown/serialize.ts` — `docToMarkdown(doc: JSONContent): string`.
  Recursive block walk; marks applied innermost-first per text node. CommonMark +
  GFM task lists. Fenced code blocks carry the language. Escapes MD-special chars
  in plain text runs.
- `src/lib/markdown/parse.ts` — `markdownToDoc(md: string): JSONContent`. Line-based
  parser for our frozen subset (headings, `- `/`* `/`1. `, `- [ ] `/`- [x] `,
  `> `, ``` fences, `---`, inline `**`/`*`/`~~`/`` ` ``/`[]()`). Anything
  unrecognized → paragraph text (never throws — a weird `.md` must still import).
- `src/lib/exportNotes.ts` — orchestration: `exportNote(note)` (single `.md`
  download), `exportAllNotes(notes)` (stream a `.zip` via `client-zip`). Filenames
  = `slugify(title)`-`id.slice(0,6)`.md, collision-safe.

**Wiring (`app.astro`)**
- Editor toolbar: add a **⤓ export** button → downloads the active note's `.md`.
- Sidebar header: add an **overflow "···" menu** with *Export all (.zip)* and
  *Import .md*. (Keeps the toolbar uncluttered; menu is the home for bulk ops.)
- **Import** = hidden `<input type="file" accept=".md,.markdown,text/markdown"
  multiple>` + a full-window **drag-drop overlay** (dragover → show "Drop .md to
  import", drop → parse each → `store.seedNote(doc, color)`). Multiple files = N
  notes. Toast: "Imported N notes".

**Dep:** `client-zip` (exact-pin latest stable). **No other deps.**

**Verify:** round-trip a doc with every node/mark type (export→parse→deep-equal on
the loss-free subset); `.zip` opens + contains N files; drag-drop import of 3 files
creates 3 notes; malformed `.md` imports as a single paragraph note (no throw);
island gzip still < budget.

## Commit 16 — `feat(pwa): installable PWA + offline app shell`

**Goal:** AOTN installs like a real app AND works with no network. Fixes the
manifest 404.

**New files**
- `public/manifest.webmanifest` — name/short_name from `site`, `display:
  standalone` + `display_override:[window-controls-overlay,standalone]`,
  `start_url:/app`, `scope:/`, theme `#fde047`, background `#0a0a0a` (matches
  first-paint dark body), categories `[productivity, utilities]`, icons (192/512/
  maskable-512/favicon.svg).
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` —
  generated from the brand mark (yellow sticky). Maskable = 12.5% safe-zone pad.
- `public/sw.js` — **offline app-shell** (Decision B): precache `/`, `/app`,
  `/compare`, `/faq`, `/offline`, hashed `_astro/*` (built list injected at build),
  `paper-noise.svg`, icons, manifest. Strategy: **cache-first for same-origin
  static, network-falling-back-to-cache for navigations, offline page as last
  resort.** Versioned cache name; `activate` deletes old caches. `skipWaiting` +
  `clients.claim`.
- `src/lib/pwaInstall.ts` — capture `beforeinstallprompt` (preventDefault), custom
  install pill UI, iOS Safari A2HS hint (8s delay), `appinstalled` sticky bit,
  14-day dismiss cooldown. Multi-layer installed-detection. `aotn:` namespaced keys.
- `src/pages/offline.astro` — tiny branded "You're offline — your notes are safe
  on this device" page (the nav fallback). `noindex`.

**Wiring**
- `Layout.astro`: add `<link rel="apple-touch-icon" href="/icon-192.png">`; SW
  registration script already-safe pattern (register on `load`). Manifest link
  already present.
- `app.astro`: `initPwaInstall()` in the island init.

**SW cache-busting:** cache name embeds a build id so each deploy rotates the
cache (avoids the stale-Worker class — see family skill). Precache list of hashed
assets generated at build (small Astro integration or a post-build glob written
into `sw.js` via a placeholder swap).

**Verify:** `curl -I /manifest.webmanifest` → 200 + `application/manifest+json`;
DevTools → Application → Manifest renders icons + no errors; Lighthouse PWA
"installable" ✓; offline (DevTools offline) → reload `/app` still boots from cache
+ notes load from IDB; install pill appears on a fresh desktop Chrome profile;
old cache purged on a version bump.

## Commit 17 — `feat(app): in-app theme toggle (dark/light/system)`

**Goal:** let users flip theme without OS settings. Cheatsheet already shipped, so
this is JUST the toggle.

**Wiring (`app.astro` + `Layout.astro` bootstrap)**
- Header: a compact **theme button** (left of the PiP toggle) showing
  sun/moon/monitor for the current mode. Click cycles **dark → light → system**.
- State: `aotn:theme` ∈ `{dark, light, system}`. `system` = remove the override,
  follow `prefers-color-scheme` live (via a `matchMedia` change listener).
- The existing `Layout.astro` pre-paint bootstrap already reads `aotn:theme` +
  sets `data-theme` before paint — extend it to the tri-state (treat missing/
  `system` as "follow OS", explicit `dark`/`light` as pinned). No FOUC.
- A11y: `aria-label` reflects current + next ("Theme: dark. Switch to light.");
  reduced-motion safe (icon swap, no spin if RM).
- **PiP parity:** the theme bridge (commit 12 `mirrorAttrs:["data-theme"]`) already
  copies `data-theme` origin→float; verify toggling theme while floating updates
  both (re-mirror on change).

**Verify:** cycle persists across reload; `system` tracks an OS theme change live
without reload; pinned dark/light ignores OS; no pre-paint flash; float reflects a
theme change made while popped out; island gzip ~flat.

## Commit 18 — `chore(seo): WebApplication JSON-LD + OG image + sitemap fix`

**Goal:** ship-readiness — rich-result eligibility, working share cards, clean
sitemap. GA4 already wired, so this is schema + assets + the sitemap fix.

**Changes**
- `src/pages/index.astro`: add **`WebApplication`** JSON-LD via the existing
  `jsonLd` Layout prop (layered pattern — Org + WebSite already sitewide).
  `applicationCategory: ProductivityApplication`, `offers price 0`, `featureList`
  = the hero chips, `operatingSystem: Any`, `browserRequirements` notes Document
  PiP for the float. `publisher` → `@id` ref to the sitewide Organization.
- `public/og-image.png` (1200×630) — **fixes the broken share card.** Dark card
  (cream sticky + tagline + domain), matches family OG aesthetic. Generated, not
  hand-placed. (Also add an `assets/og-image` source if we keep a regen script.)
- `src/pages/sitemap.xml.ts`: **drop `/app`** (it's `noindex` — a noindexed URL in
  the sitemap is a Search-Console warning). Keep `/`, `/compare`, `/faq` + add any
  trust pages that exist. Confirm `<lastmod>` present.
- Sanity: `robots.txt` sitemap URL matches `site.url` (already
  `alwaysontopnotes.com`).

**Verify:** `grep application/ld+json dist/index.html` count = 3 (Org+WebSite+
WebApp); `@type` set includes `WebApplication`; Rich Results Test (post-deploy)
eligible + 0 errors; `curl -I /og-image.png` → 200; OG renders in a real unfurl;
sitemap no longer lists `/app`; build 0 errors / `astro check` 0/0/0.

---

## Scaling / cost (per user's up-front-math rule)

All-static on Cloudflare Pages CDN; export (`client-zip` ~3 KB, runs client-side),
PWA (precache served from CDN, SW runs on device), toggle (~0.5 KB), schema/OG
(build-time). **Zero server, zero per-user cost at 1M / 10M / 100M DAU** — every
new feature is either build-time or client-compute. `/app` island stays well under
the 200 KB gzip budget (current ~10 KB; +export+pwa+toggle ≈ +5 KB).

## Per-commit loop (firm)

`npm run build` (0 err) → `npx astro check` (0/0/0) → browser QA (sim where headless
allows) → `git commit` (one feature, detailed body) → `git push` → "live ~90s" +
what-you-got bullets → offer next.
