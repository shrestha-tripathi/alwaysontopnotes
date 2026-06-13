# UX Charter — AlwaysOnTopNotes

**Status:** v1.0 · approved 2026-06-13
**Owner:** Shrestha Tripathi
**Bar:** Notion-grade UX. Buttery animations. Sub-100ms interactions. Zero compromise.

This doc is the **north-star** for every UI/UX decision. If a commit weakens any
guarantee here, the commit is rejected. If a competitor matches a guarantee,
we go a level deeper.

---

## 1. The Switch Promise (landing-page copy spine)

We are competing against THREE incumbents that the user already has installed
and uses every day:

1. **Windows Sticky Notes** (pre-installed on every Windows 10/11 machine)
2. **macOS Stickies** (pre-installed on every Mac)
3. **Apple Notes / Google Keep** (cloud-default, cross-device)

We cannot win on inertia. We win on **seven hard advantages** that those tools
**structurally cannot match**, each one tied to a frustration we can quote
back to the user verbatim:

### The Switch Table (must appear on `/` and `/compare`)

| What you hate | Native sticky notes | AlwaysOnTopNotes |
|---|---|---|
| **Notes hide behind Zoom/Teams** | ❌ Stuck behind any fullscreen app | ✅ **Real OS-level floating window** via Document PiP — survives every fullscreen, every virtual desktop, every screen share |
| **Locked to one OS** | ❌ Mac users can't read Windows notes; Linux/Chromebook users get nothing | ✅ **Same notes, every machine** — runs in any modern browser on Mac, Windows, Linux, ChromeOS |
| **"Sync" = upload to someone's cloud** | ❌ Apple iCloud / Microsoft account / Google account required | ✅ **Nothing uploads. Ever.** Notes live in your browser's local storage (OPFS) — not on a server, not in our database |
| **Plain text only** (Windows) | ❌ No markdown, no headings, no code blocks, no checklists | ✅ **Full Tiptap rich-text** — markdown shortcuts, headings, code, lists, links, drag-rearrange |
| **No way to export — locked in** | ❌ Reinstall Windows? Notes gone. Switch from Mac to PC? Notes gone. | ✅ **One-click markdown export** of any note or all notes — your data is portable forever |
| **No keyboard-first workflow** | ❌ Mouse-driven; new note = open Start menu, find app, click, then type | ✅ **`Cmd+K` command palette, `N` for new note, `/` for search** — never touch the mouse |
| **Closed source — trust us, bro** | ❌ Privacy policy says "we may collect…" | ✅ **MIT open source on GitHub** — read every line. Self-host if you want |

### Headline candidates (A/B over the first month)

- **A:** "Sticky notes that actually float over Zoom."
- **B:** "Notes that stay on top — and stay on your device."
- **C:** "Windows Sticky Notes, but they don't hide behind your browser."
- **D:** "The only sticky notes app that floats over every other window."

**Sub-headline (fixed across all variants):**
> A real OS-level floating window. Works on Mac, Windows, Linux, Chromebook.
> No install. No signup. Notes never leave your device.

### Social proof angles to chase (Phase 4)

- **GitHub stars badge** (live count) — credibility for open-source skeptics
- **"Used by N people right now"** counter — privacy-safe (no tracking, just a CF KV counter)
- **Tweets from devs / remote workers** — "this replaced Stickies for me"
- **Comparison screenshots** — actual side-by-side: us vs Windows Sticky Notes hidden behind Zoom

---

## 2. The Butter Bar — Interaction Quality Standards

Every interaction must feel **physical**. We do not ship CSS keyframes when
spring physics will do. We do not ship loading spinners when optimistic UI
will do. We do not ship empty states when sample content will do.

### Performance budget (HARD limits, measured per commit)

| Metric | Budget | Tool |
|---|---|---|
| First Contentful Paint (FCP) | < 800 ms on Slow 4G | Lighthouse |
| Largest Contentful Paint (LCP) | < 1.5 s on Slow 4G | Lighthouse |
| Time to Interactive (TTI) | < 2.0 s on Slow 4G | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.05 | Lighthouse |
| Interaction to Next Paint (INP) | < 100 ms p95 | RUM via GA4 |
| JS bundle on `/` landing | < 50 KB gzipped | rollup-plugin-visualizer |
| JS bundle on `/app` | < 200 KB gzipped (incl. Tiptap) | rollup-plugin-visualizer |
| Open empty note → typeable | < 50 ms | Manual stopwatch test |
| Pop to PiP window | < 200 ms with spring animation | Manual stopwatch test |
| Search across 100 notes | < 16 ms (one frame) | Console timing |

### Animation philosophy

- **Spring physics over keyframes.** Use Framer Motion's `spring` with
  `stiffness: 300, damping: 30` for snappy responses, `stiffness: 100,
  damping: 20` for slow elegant motion. NEVER use linear easing.
- **Motion duration ladder:** 80ms (taps), 150ms (toggles, hovers),
  250ms (panels), 350ms (page transitions), 500ms (PiP pop — needs to feel
  like a physical card lifting off).
- **Stagger sibling animations.** Note list items appear with 30ms stagger.
  Never reveal a list all at once.
- **Reduced motion respected.** `@media (prefers-reduced-motion: reduce)`
  collapses every animation to 1ms while preserving the state change.

### Tactile feedback

- **Press states.** Every interactive element has a `:active` state with
  `transform: scale(0.97)` and `transition: transform 60ms ease`.
- **Hover lift.** Cards and primary buttons lift 2px on hover with a soft
  shadow expansion (no border color flashing).
- **Click ripple.** Subtle radial gradient ripple from click coordinates,
  fades over 400ms. Inspired by Material but tuned softer.
- **Drag feedback.** Dragged note tilts 3deg, lifts 8px shadow, other notes
  bow out of the way with spring physics (dnd-kit).

### Loading philosophy

- **No spinners on the landing page.** Pre-rendered HTML means nothing
  loads. Period.
- **Optimistic UI everywhere.** New note appears instantly, persists in the
  background. If persist fails, toast appears with "retry" — no blocking.
- **Skeleton states only for the app shell**, never for content the user
  authored.
- **PiP window pop** shows the destination window opening with a
  card-physical animation, not a generic "loading…" state.

### Empty states never look empty

- **First visit to `/app`:** 1 sample note is pre-populated with:
  > "Welcome to AlwaysOnTopNotes 👋
  >
  > Try these:
  > - **Cmd/Ctrl+K** to open the command palette
  > - **N** to create a new note
  > - **/** to search
  > - Click 'Pop out' (top-right) to float this note over every window
  >
  > Notes auto-save. Nothing uploads. Delete this when you're ready."
- **Sample note is dismissible** with one click; doesn't re-appear after
  dismissal (LocalStorage flag).
- **All-notes-deleted state:** "Your fridge is empty. Press `N` to start."
  with a subtle illustration of a single sticky note, not a sad-face icon.

### Power-user shortcuts (visible in command palette)

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Open command palette |
| `N` (when not typing) | New note |
| `/` (when not typing) | Focus search |
| `Cmd/Ctrl + S` | Force save (it's already auto-saved, but reassurance) |
| `Cmd/Ctrl + Shift + E` | Export all notes as markdown ZIP |
| `Cmd/Ctrl + Shift + P` | Pop current note to PiP window |
| `Cmd/Ctrl + D` | Duplicate current note |
| `Cmd/Ctrl + Backspace` | Delete current note (with confirm toast + 5s undo) |
| `Esc` | Close PiP / close palette / unfocus search |
| `J / K` | Navigate notes up/down (vim-style) |
| `?` | Show all keyboard shortcuts modal |

### Smart pastes (Tiptap extensions)

- **Paste URL only** → auto-fetches `og:title` (client-side via CF Worker
  proxy to avoid CORS) → inserts as `[Title](url)` markdown link.
- **Paste markdown** → renders rich, not as plain text.
- **Paste image** → stores in OPFS, embeds inline (Phase 4).
- **Paste code-looking text** (3+ lines with `{`, `;`, `=>`, etc.) → wraps
  in code block with syntax detection.

---

## 3. Visual Polish Standards

### Paper texture, not flat color

- Notes use a subtle SVG noise texture overlay (~3% opacity) on top of the
  yellow background — gives a paper feel that flat hex colors never will.
- Texture file: `public/assets/paper-noise.svg` (inline, < 1 KB).

### Color picker — 8 colors, semantic

Not arbitrary swatches. Each color has an implicit meaning, hover tooltips
spell it out, helping users build a personal taxonomy:

| Swatch | Hex | Implied meaning |
|---|---|---|
| Yellow (default) | `#fde047` | Generic / inbox |
| Pink | `#fbcfe8` | Personal |
| Blue | `#bae6fd` | Work |
| Green | `#bbf7d0` | Done / archive |
| Orange | `#fed7aa` | Urgent |
| Purple | `#e9d5ff` | Idea |
| Gray | `#e5e7eb` | Reference |
| Cream | `#fef9c3` | Pinned / important |

### Sticky-note shadow stack

Each note gets a **layered shadow** to feel physical, not just a box:

```css
box-shadow:
  0 1px 2px rgba(0,0,0,0.05),     /* tight contact shadow */
  0 4px 12px rgba(0,0,0,0.08),    /* mid soft shadow */
  0 16px 32px -8px rgba(0,0,0,0.12); /* far ambient shadow */
```

When dragged: shadow expands proportionally, suggesting lift.

### Slight rotation on note cards

Each card in the sidebar gets a deterministic micro-rotation (-2deg to
+2deg, hashed from note ID) — feels like real sticky notes pinned to a
board, not a sterile spreadsheet.

### Typography hierarchy

- **Hero h1:** Inter 700 weight, 72px desktop / 40px mobile, -0.025em tracking
- **Section h2:** Inter 700, 48px / 32px, -0.02em
- **Body:** Inter 400, 17px / 16px, 1.65 line-height
- **Note title:** Inter 600, 18px
- **Note body:** Inter 400, 15px, 1.55 line-height
- **UI labels:** Inter 500, 13px, 0.01em tracking
- **Captions / chips:** Inter 500, 12px, uppercase, 0.05em tracking

Never use any other font family. Never weight below 400. Never use italic
for emphasis — use semantic `<strong>`.

---

## 4. The Onboarding Tour (first-visit only)

When a user visits `/app` for the very first time (no LocalStorage flag),
trigger a 4-step tour that takes **under 30 seconds**, can be skipped at
any point with Esc, and never re-appears:

1. **Welcome card** in center of screen
   - "Sticky notes that float over every window."
   - "Want a 30-second tour? [Yes, show me] [No, I'll explore]"

2. **Step 1: Make a note** (sample note already visible)
   - Highlight: the note in the sidebar
   - Copy: "Click anywhere in this note to start typing. Auto-saves as you go."

3. **Step 2: Pop it out**
   - Highlight: the "Pop out" button (with a subtle pulse animation)
   - Copy: "Click 'Pop out' to make this note float over Zoom, Slack,
     full-screen video — anything."
   - Mini-illustration: a sticky note hovering above a Zoom window mockup.

4. **Step 3: Find it again**
   - Highlight: the search bar
   - Copy: "Press `/` to search. Press `Cmd/Ctrl+K` for everything else."

5. **Done card**
   - "That's it. You're ready."
   - "Try [popping out this note] right now → "

Total animation between steps: 250ms spring. Tour can be re-launched from
the `?` keyboard shortcut modal.

---

## 5. The PiP Pop Animation (the signature moment)

This is the moment that proves the product. Must feel **magical**.

1. User clicks "Pop out" → button scales down 0.95 for 60ms (press feedback)
2. The note card in the main window **lifts** (shadow expands, scales 1.05,
   80ms spring)
3. A ghost copy of the card flies toward the top-right of the screen with a
   spring trajectory (350ms, slight arc)
4. PiP window opens at the cursor position (Document PiP API)
5. The note appears in the PiP window with a 250ms scale-in spring
6. Main window shows the note in "popped out" state — dimmed, with a
   "Pop back" button visible in its place
7. On hover of the dimmed note in main window, it offers "Bring back"

If any step takes longer than its budget, the next step starts anyway —
animation must always feel snappy, never blocked by API latency.

---

## 6. Trust Signals — Make Privacy Feel Real

Privacy claims are cheap. We make them tangible:

- **Footer:** "0 KB sent to any server" with a real network-tab screenshot
  link
- **About page:** Architecture diagram showing data flow stops at the
  browser
- **"Verify yourself" button** in settings: opens DevTools network tab and
  highlights that no XHR requests fire on note save
- **GitHub link** on every page — not buried in footer
- **MIT license badge** visible in the footer + about page
- **No cookies** banner needed (because we don't set any) — but a one-liner:
  "🍪 No cookies. No tracking. Just notes."

---

## 7. Mobile Considerations

Mobile is a **secondary** experience (Document PiP only works on desktop
Chrome/Edge), but the marketing site MUST be flawless on mobile because:

- Most discovery happens on mobile (search, social shares)
- Users will visit on phone, decide to come back on desktop
- A clunky mobile site kills credibility

### Mobile rules

- Hero CTA on mobile: "Open notes on desktop →" with a small note: "PiP
  works on Mac/Windows/Linux Chrome 116+ & Edge"
- Comparison table becomes a vertical card stack on mobile
- All tap targets ≥ 44×44 px
- No horizontal scroll, ever
- Heavy assets (mechanism animation videos) lazy-load below the fold

### `/app` on mobile

- **Read-only view** of notes (synced via … wait, no sync. So just whatever
  the user typed in the same browser on the same device.)
- "PiP not supported on mobile" gentle banner with desktop CTA
- Future: PWA install on mobile = standalone notes app (no PiP, but full
  Tiptap editing)

---

## 8. Quality Gates (per-commit checklist)

Before merging any commit that touches UX:

- [ ] Lighthouse score ≥ 95 on Performance, Accessibility, Best Practices, SEO
- [ ] No new JS dependencies > 30 KB gzipped without explicit approval
- [ ] All animations respect `prefers-reduced-motion`
- [ ] All interactive elements have visible focus states (not removed)
- [ ] All color combinations pass WCAG AA contrast (4.5:1 body, 3:1 large)
- [ ] No layout shift on font load (font-display: swap + size-adjust fallback)
- [ ] Keyboard navigation works for every feature (no mouse required)
- [ ] Screen reader announces state changes (aria-live regions where needed)
- [ ] Works in Safari (even though PiP doesn't — graceful degradation banner)

---

## 9. Anti-patterns — what we WILL NOT ship

- ❌ Cookie consent banner (we don't set cookies)
- ❌ "Allow notifications?" prompt (we don't need notifications)
- ❌ "Sign up for our newsletter" anywhere
- ❌ Pop-up modals on landing page (the page IS the pitch)
- ❌ Auto-playing video with sound
- ❌ Lazy-loaded above-fold content (loads pixel-perfect on first paint)
- ❌ "Did you find what you were looking for?" survey
- ❌ Chat widget / Intercom-style bubble
- ❌ AI-generated stock photography of laptops on desks
- ❌ Hover-to-reveal nav menus (always visible or always behind hamburger)
- ❌ Custom scrollbars (we use the OS scrollbar)
- ❌ Spinning loaders (we use skeletons or optimistic UI)
- ❌ Confirmation dialogs for non-destructive actions
- ❌ Toasts that stack vertically (one at a time, replaces previous)

---

## 10. The Test: Would a Windows User Actually Switch?

The honest test for every feature: imagine a Windows 11 user who has had
the Sticky Notes app open in their taskbar for 3 years. Why would they
quit it today and use ours instead?

**The answer must be one of these three things, every time:**

1. **It does something Windows Sticky Notes structurally cannot do** (float
   over Zoom, work on Mac too, export as markdown)
2. **It does the same thing but obviously better** (rich text vs plain
   text, command palette vs mouse-only, instant search)
3. **It removes a real concern they have** (cloud upload of private notes)

If a feature doesn't pass this test, we don't build it. We're not building
"another notes app" — we're building **the one thing native sticky notes
can never be: a floating, cross-platform, private-by-architecture, rich,
keyboard-first sticky note that's actually open source.**

---

*This charter is a living document but every change requires explicit
approval. Last reviewed: 2026-06-13.*
