# SPEC — Phase 3: Document Picture-in-Picture (commits 12–14)

> **This is the headline feature.** AOTN exists so a note can float in a real,
> always-on-top OS window while you work in another app. Phases 1–2 built a
> Notion-grade notes app; Phase 3 makes it *float*. Reuses ~90% of FTN's
> `pipWindow.ts` / `pipTour.ts` (see `document-pip-app-shell-relocation` skill).

Status going in: Phase 2 complete (`abf07d5`), `/app` island 8.8 KB gzip, clean tree.

---

## 0. The load-bearing decision — WHAT floats?

The `/app` DOM is:

```
#app-root (flex col, 100dvh)
├── <header>           brand link · #save-status · "🔒 On your device"
├── <div> two-pane (flex row)
│   ├── <aside>        sidebar: search + #note-list + empty/no-results states
│   └── <main>         editor: #editor-toolbar · #color-popover · #editor-host
├── #bubble-menu       Tiptap floating selection toolbar  ← SIBLING of two-pane
├── #toast             undo-delete toast                  ← SIBLING
└── #shortcuts-modal   `?` modal                          ← SIBLING
```

**Three overlays (`#bubble-menu`, `#toast`, `#shortcuts-modal`) live OUTSIDE
`<main>`.** FTN floats its `<main>`; if we copied that verbatim here, those
three overlays would be left behind in the origin tab and break inside PiP
(bubble toolbar wouldn't appear on selection; undo + `?` wouldn't render).

### Decision 0 — float `#app-root`, hide the sidebar via CSS  ⭐

| Option | What moves | Overlays work in PiP? | Sidebar in PiP? | Verdict |
|---|---|---|---|---|
| A: move `<main>` (FTN-style) | editor only | ❌ bubble/toast/modal stranded | n/a | rejected |
| B: re-home overlays into `<main>` first, then move `<main>` | editor + 3 moved nodes | ✅ but adds fragile pre-move surgery | hidden (separate) | over-engineered |
| **C: move `#app-root` whole, hide `<aside>` with `:where(.pip-mode)` CSS** ⭐ | the entire app | ✅ all travel together | hidden via CSS | **picked** |

**C is the cleanest** and is exactly what the roadmap's commit-13 line implies
("Sidebar hidden in PiP"). The whole coherent app moves as ONE element →
every event listener, the Tiptap instance, the store singleton, all overlays,
and `#save-status` survive intact (one-shot reparent = same JS identity). The
sidebar is simply hidden with a 1-line CSS rule so a single note fills the
floating window. Restore puts `#app-root` back and the sidebar reappears.

> Reparent target = `#app-root`. The skill's "move the ELEMENT not its
> children" rule still applies — we move `#app-root` itself so the
> `:where(.pip-mode) #app-root …` rules match inside PiP.

---

## 1. Three problems FTN's skill never had to solve

FTN is **click-driven, single-theme-at-move-time**. AOTN is **keyboard-driven
+ mandatory dual-theme + a focused contentEditable**. Moving the shell exposes
three issues the reusable skill doesn't cover. These are the real Phase-3 work;
the PiP plumbing itself is a paste.

### 1a. The global keymap goes DEAF inside PiP  (commit 13)
N · / · J · K · ? · Esc · Cmd+S · Cmd+⌫ are bound to the **origin**
`document` (`app.astro` line 837). A PiP window is a **separate document**;
keystrokes inside it never reach the origin listener. **Every shortcut dies in
PiP** unless we re-bind. Same for the document-level click-outside handler
(line 785, closes the color popover).
**Fix:** extract the keydown + click-outside handlers into named functions;
on PiP open, `addEventListener` them on `pipWindow.document`; on restore,
remove them. Origin keeps its own binding the whole time (sidebar still works
if focused). Net: shortcuts work in BOTH documents.

### 1b. The floating note renders in the WRONG theme  (commit 12)
`data-theme` lives on the **origin** `<html>`. The PiP `<html>` is created
without it → CSS theme vars fall back to `:root` (dark) regardless of the
user's choice. Violates the project's mandatory-dual-theme rule.
**Fix:** in `openPip`, copy `data-theme` from origin `<html>` to the PiP
`<html>` right after adding `.pip-mode`. (Generic enough to bake into the
reused `pipWindow.ts` as an optional `mirrorAttr` step.)

### 1c. Reparenting blurs the editor  (commit 12)
Moving a focused `contentEditable` across documents drops focus → the user
pops out and can't immediately type.
**Fix:** after the move, if a note is active, `editor.commands.focus()` (via
the existing `focusEditorSoon` rAF-poller) so the caret is live on arrival.

---

## 2. Commit plan (3 commits, each independently deployable)

### Commit 12 — `feat(pip): Document PiP toggle + float the app shell`
- **New** `src/lib/pipWindow.ts` — adapted FTN file. Exports `isPipSupported`,
  `isPipOpen`, `openPip`, `closePip`. Generalize two things vs FTN:
  - `sourceEl` = `#app-root` (not `<main>`).
  - add optional `mirrorAttrs?: string[]` (default `["data-theme"]`) copied
    origin `<html>` → PiP `<html>` (fixes 1b). Keep stylesheet-clone, the
    3-trigger restore safety net, `importNode`, `:where(.pip-mode)` hook
    verbatim — they're correct and battle-tested.
- **Markup** in `app.astro`:
  - `#pip-toggle` button in the `<header>` (right cluster, before "On your
    device"). `hidden` by default; unhidden only when `isPipSupported()`.
    Lucide `picture-in-picture-2` icon + a close variant.
  - `#pip-placeholder` as a **sibling AFTER `#app-root`** (NOT inside it —
    the move empties `#app-root`'s parent slot). "📺 Floating — [Bring back]".
- **Init wiring** (island): feature-gate, `togglePip()`, icon swap, on-open
  `focusEditorSoon()` (fixes 1c), placeholder Bring-back button.
- Size: default **400×500** (DECISION 7-A — sticky-note proportions). Per-note
  saved size deferred to commit 13.
- **Verify:** button appears on Chromium only; pop-out floats the whole note,
  theme matches origin, caret live, editing persists; close restores the app
  in place; sidebar returns.

### Commit 13 — `feat(pip): compact PiP layout + keymap rebind + per-note size`
- **CSS** `:where(.pip-mode)` block in `global.css`:
  - hide `<aside>` (sidebar) + the brand text + `#pip-toggle` (redundant
    inside PiP — close is in the title bar).
  - `#app-root`/`<main>` full-width, tightened padding; `#editor-toolbar`
    stays (color/pin/delete are useful in PiP).
  - placeholder never shows inside PiP (defensive `display:none`).
- **Keymap + click-outside rebind** (fixes 1a): refactor the two document
  listeners into named handlers; `bindGlobalKeys(doc)` / `unbind` helpers;
  bind PiP doc on open, unbind on restore.
- **Per-note size prefs:** PiP window `resize` → debounced save of
  `pipWidth`/`pipHeight` onto the active note (schema fields already exist,
  line 86–87). On next pop-out of that note, open at its saved size (fall
  back to 400×500). New store method `updateNoteSize(id, w, h)` (light meta
  write; mirrors `updateActiveDoc`'s persistence path; broadcasts via
  existing cross-tab `put`).
- **Verify:** sidebar hidden in PiP; N/J/K/?/Esc/Cmd+S all work *inside* the
  floating window; resize persists and reopens at saved size.

### Commit 14 — `feat(pip): first-run onboarding pointer`
- **New** `src/lib/pipTour.ts` — adapted FTN file. One-step spotlight +
  popover pointing at `#pip-toggle`. localStorage `aotn:pip-tour-seen-v1`.
  Self-bails on: SSR, no PiP support, returning users, missing anchor.
  ~2.5s first-paint delay so it doesn't fight the welcome note.
- Copy the tour CSS (backdrop/spotlight/popover) into `global.css`, renamed
  `aotn-pip-tour-*`.
- **Verify:** fires once on first Chromium visit; never on FF/Safari; sticky
  bit prevents re-fire on reload.

---

## 3. Non-goals (defer)
- ❌ Multiple simultaneous PiP windows (browser allows ONE Document PiP at a
  time — out of our hands).
- ❌ Dragging a specific note's card directly into PiP — the floating window
  shows the *active* note; switch notes by bringing back. (Revisit if it
  feels clunky in field test.)
- ❌ Opacity / always-darken prefs (`document-pip-overlay-prefs` territory) —
  not requested; size prefs only.
- ❌ Auto-open on any event — PiP requires a user gesture every time (skill
  pitfall #4/#12).

## 4. Budget & invariants
- `/app` island stays < 200 KB gzip (PiP code is ~5 KB; trivial).
- Zero new deps (Document PiP is a browser API).
- Strict TS, `npm run build` 0 errors, `astro check` 0/0/0.
- Additive-only: deleting the 2 new files + wiring returns Phase-2 behavior.
- Desktop-Chromium feature; FF/Safari/mobile see ZERO new UI (button hidden).

## 5. Verification matrix (browser QA)
| Check | How |
|---|---|
| Button hidden on unsupported | `isPipSupported()` false path (can't test in our Chromium cloud — assert gate logic) |
| Whole app floats | pop out → note + toolbar render in PiP doc; `#app-root` is in `pipWindow.document.body` |
| Theme bridged | PiP `<html data-theme>` === origin; swatch/chrome colors match |
| Caret live on open | `pipWindow.document.activeElement` is the ProseMirror node |
| Shortcuts in PiP | dispatch N/J/K/Cmd+S as KeyboardEvents on PiP doc → note created / saved |
| Sidebar hidden | `getComputedStyle(aside).display === "none"` in PiP |
| Resize persists | set PiP size → reload → reopen → opens at saved size |
| Restore in place | close → `#app-root` back in origin, sidebar visible, button reset |
| No console errors | throughout |

---

**Approval ask:** Decision 0 (float `#app-root`, hide sidebar via CSS) and the
three fixes in §1 are the judgment calls. If you're good with them, say
**`next`** / **`go`** and I ship commit 12. Want to tweak (e.g. keep the
sidebar visible in PiP as a mini-list, or a different default size)? Flag it now.
