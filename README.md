# AlwaysOnTopNotes

> Sticky notes that float over every app via Document Picture-in-Picture. Free forever, no install, no signup. Notes stay on your device.

Live at **[alwaysontopnotes.com](https://alwaysontopnotes.com)**.

---

## Why

Existing options for "always on top" sticky notes are all native installs:
**Windows Sticky Notes** (Microsoft Store), **macOS Stickies** (Apple-only),
**Notezilla** (Windows install with adware), **Stickies.app** (Mac install).

None are cross-OS. None are browser-based. None work without install.

**AlwaysOnTopNotes** is the first browser-native floating sticky-notes app,
using the **Document Picture-in-Picture API** (Chrome/Edge 116+) to open a
real OS-level floating window — same API that powers
[LiveCaptionIt](https://livecaptionit.com).

## How it works

- Notes live in **OPFS** (Origin Private File System) — local-first, ~1GB
  capacity, never uploaded anywhere
- Click **Pop out** → note relocates into a Document PiP window
- That window stays on top of every other app (Zoom, Slack, VS Code, etc.)
- Close PiP → note returns to the main tab, all changes saved
- Cross-tab sync via **BroadcastChannel** — open multiple notes in
  multiple tabs without conflicts

## Stack

- Astro 6 + Tailwind v4 + TypeScript strict
- Tiptap v2 editor (Markdown + checkboxes + colors)
- Document Picture-in-Picture API
- OPFS + BroadcastChannel
- Cloudflare Pages auto-deploy from `main`

## Dev

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
```

## Brand discipline

All brand strings live in `src/site.config.ts`, overridable via `.env`. To
rebrand, edit `.env` only — no code changes.

See `DESIGN.md` for the visual system and `AGENTS.md` for code conventions.

## License

MIT — your notes never leave your device, and the code that promises that
is fully auditable here.
