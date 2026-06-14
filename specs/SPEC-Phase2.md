# SPEC — AlwaysOnTopNotes · Phase 2 (Notes App Core)

> **Status:** APPROVED 2026-06-14 — IndexedDB-primary + Tiptap v3 + 6-commit plan.
> Storage kept behind `StorageAdapter` so OPFS / sqlite-wasm is a drop-in later.
> **Depends on:** Phase 1 (landing site) ✅ shipped · 6 commits
> **Builds:** the actual `/app` — create/edit/delete/search/color/pin notes,
> persisted locally, rich-text via Tiptap, consistent across browser tabs.
> **Does NOT build:** Document PiP (Phase 3), export/PWA/palette (Phase 4).

**Goal:** A fully usable, local-first sticky-notes app at `/app` that survives
reload and stays in sync across tabs — Notion-grade editing, zero backend.

**Architecture:** One client-side Astro page (`app.astro`) hosting a single big
`<script>` island (the FTN `transfer.astro` pattern). A reactive in-memory
`notesStore` is the UI's source of truth; a pluggable `StorageAdapter` persists
it; an emitter drives re-renders; a `BroadcastChannel` keeps sibling tabs
consistent. **Vanilla Tiptap** (no React) for the editor.

---

## §0 · ONE DECISION TO RE-OPEN BEFORE WE BUILD ⚠️

SPEC-v0.1 Decision 3 chose **OPFS file-per-note** as primary storage. But your
own hard-won `local-first-ai-pwa` skill (built shipping **Pensive**, your other
notes app) says verbatim:

> Storage: **IndexedDB** via `idb`. GB-scale, browser-native, persistent.
> **NOT OPFS (too fiddly for v1; migrate later if needed).**

This is a real contradiction between the AOTN spec and your accumulated
experience, and it's load-bearing (it's commit 7). I want to settle it now.

### Tradeoff table

| | **OPFS** (current spec) | **IndexedDB via `idb`** (your Pensive choice) ⭐ |
|---|---|---|
| Privacy claim | "Nothing uploads, ever" ✅ | **Identical** ✅ — both are on-device, zero network |
| Browser support | Chrome/Edge/Safari 17+/FF 111+; **denied in private mode** | Everywhere modern, **works in private mode** |
| Fallback code | Needs a whole 2nd IndexedDB path anyway (Decision 4) | **None needed** — it IS the universal path |
| Write model | `createWritable()` per note file, index-drift risk → recovery sweep | One transaction, structured, no drift |
| Cross-tab | Shared, but file-handle lock contention possible | Shared, transactional, cleaner |
| User-visible benefit of files | ~none (browsers don't let users browse OPFS) | — |
| Your prior verdict | "too fiddly for v1" | "the right v1 choice" |

### My recommendation: ⭐ **flip to IndexedDB primary**

Reasoning: the privacy/brand story ("notes never leave your device") is **100%
true either way** — users can't tell OPFS from IDB, and no marketing copy
actually needs the word "OPFS" (site.config says "stay on your device", which
IDB satisfies). IDB works in *more* browsers, needs *zero* fallback path, has no
index-drift problem, and is exactly what you already proved out on Pensive. OPFS
buys us nothing a user can perceive while costing real complexity.

**Keep OPFS as a Phase 4 enhancement** *only if* we ship "export notes as a real
folder of `.md` files via the File System Access API" and want the on-disk
mirror — and even then it's additive, not the primary store.

> The rest of this spec is written **storage-agnostic** behind a `StorageAdapter`
> interface, so this decision only swaps ~50 lines in one file either way.
> Everything else stands regardless of which you pick.

**One marketing footnote:** UX-CHARTER §1 currently says "(OPFS)" in the sync
row. If we flip, change it to "your browser's local storage" — softer and
still accurate. One-line edit.

---

## §1 · Storage architecture

Single interface, one implementation chosen at boot via feature-detect:

```ts
// src/lib/storage/types.ts
export interface StorageAdapter {
  /** Lightweight list for the sidebar — never loads full docs. */
  list(): Promise<NoteIndexEntry[]>;
  /** Full note (with Tiptap doc) — loaded lazily on select. */
  get(id: string): Promise<Note | null>;
  /** Create or update (idempotent on id). Writes updatedAt-tagged record. */
  put(note: Note): Promise<void>;
  /** Hard-delete. (Soft-delete/undo handled in store layer, §6.) */
  remove(id: string): Promise<void>;
  /** Rebuild list cache from source of truth (OPFS: re-scan files; IDB: no-op). */
  recover(): Promise<void>;
}
```

- **`idbAdapter.ts`** (recommended): one `notes` object store keyed by `id`,
  with an `updatedAt` index. `list()` reads a projection (light fields only).
  `idb` (~1 KB) gives the typed `openDB`/`upgrade` ergonomics. Schema versioning
  via `upgrade(db, oldVersion)` — **never lose data on bump.**
- **`opfsAdapter.ts`** (alt): `notes/{id}.json` + `notes/_index.json`. Write via
  main-thread `createWritable()` (files are KB-sized; no Worker needed).
  `recover()` re-scans the dir to heal index drift. Falls back to `idbAdapter`
  when `navigator.storage.getDirectory` is missing/denied.

Boot picks one:
```ts
export async function pickStorage(): Promise<StorageAdapter> {
  // If we keep OPFS: try OPFS, catch → idb. If IDB-primary: just return idb.
  return makeIdbAdapter(); // ← recommended default
}
```

For <1000 notes, `list()` reading all light records is **< 16 ms** (meets
UX-CHARTER search budget). At 10k+, switch `list()` to the `updatedAt` index +
cursor — interface unchanged.

---

## §2 · Note schema — V1 FROZEN FORMAT 🧊

Ship this once. **Never remove or rename a field.** Only ever *add optional*
fields and bump `SCHEMA_VERSION`, with a migration in the adapter's `upgrade`.

```ts
// src/lib/types.ts — V1. FROZEN. (add-only forward)
export const SCHEMA_VERSION = 1;

export type StickyColor =
  | "yellow" | "pink" | "blue" | "green"
  | "orange" | "purple" | "gray" | "cream";   // 8, matches DESIGN.md §2

export interface Note {
  id: string;          // crypto.randomUUID(); stable, never reused
  v: number;           // SCHEMA_VERSION the record was written with
  doc: JSONContent;    // Tiptap JSON — the content source of truth
  plainText: string;   // flattened text; derived on every save (search + title)
  title: string;       // first non-empty line of plainText, ≤ 80 chars; derived
  color: StickyColor;
  pinned: boolean;
  pipWidth?: number;   // per-note PiP size (Phase 3 reads these; harmless now)
  pipHeight?: number;
  createdAt: number;   // epoch ms
  updatedAt: number;   // epoch ms; last-write-wins key for cross-tab
}

/** Everything the sidebar needs WITHOUT deserializing full docs. */
export interface NoteIndexEntry {
  id: string;
  title: string;
  color: StickyColor;
  pinned: boolean;
  updatedAt: number;
  preview: string;     // first ~120 chars of plainText
}
```

**Why these and only these (YAGNI):** no `tags`, no `parentId/order` (no nesting
in v1 — SPEC out-of-scope), no `starred` (we have `pinned`). `pipWidth/Height`
are the only forward-looking fields, included now purely so Phase 3 doesn't need
a schema bump.

**Derivation rule:** `title` and `plainText` are **always** recomputed from
`doc` on save — never trust a stale value, never let the user set `title`
directly. `deriveTitle(plainText)` = first non-empty trimmed line || "Untitled".

---

## §3 · State management — plain reactive store (NO Nano Stores) ⭐

`/app` is a **single island** (one big `<script>`), so we don't need
cross-island state. A module-level reactive store + the FTN emitter is lighter
and zero-dep.

```ts
// src/lib/notesStore.ts
import { Emitter } from "./emitter"; // COPIED from FTN, proven

interface State {
  index: NoteIndexEntry[];   // sidebar list (sorted: pinned first, then updatedAt desc)
  activeId: string | null;   // selected note
  active: Note | null;       // full doc of the selected note
  query: string;             // search box
  saving: boolean;           // drives the "Saved ✓ / Saving…" indicator
}

export const store = {
  emitter: new Emitter<{ change: State }>(),
  // get/set, createNote(), selectNote(id), updateActiveDoc(doc),
  // setColor(id,c), togglePin(id), deleteNote(id) (soft, §6), setQuery(q)
};
```

- One source of truth; every mutation calls `persist()` (debounced) + `emit()`.
- Sidebar + editor subscribe to `change` and re-render their slice.
- **Optimistic UI** (UX-CHARTER §loading): mutate in-memory + emit *immediately*;
  persist in background; on persist failure → toast "Couldn't save · retry".

Escape hatch documented: if we ever split `/app` into multiple Astro islands,
swap this for **Nano Stores** (~1 KB, Astro-blessed) — same shape.

---

## §4 · Tiptap setup — **VANILLA, not React** ⚠️

> 🚨 **Implementer trap:** the `local-first-ai-pwa` skill uses `@tiptap/react`
> + JSX `<BubbleMenu>`. This repo is **Astro MPA, zero React.** Use the vanilla
> `Editor` class from `@tiptap/core` and `@tiptap/extension-bubble-menu`
> (vanilla build). Do **not** install any `@tiptap/react*` package.

```ts
// src/lib/tiptapSetup.ts
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";

export function makeEditor(el: HTMLElement, doc: JSONContent, onUpdate: ...) {
  return new Editor({
    element: el,
    content: doc,
    extensions: [
      StarterKit,                                  // p/h/bold/italic/strike/code/lists/quote/codeBlock/hr/HISTORY
      TaskList, TaskItem.configure({ nested: true }), // checkboxes — core to sticky notes
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder: "Write something…" }),
      Typography,                                  // smart quotes/dashes — 1-line quality boost
      TextStyle, Color,                            // text color (DESIGN-approved)
    ],
    onUpdate: ({ editor }) => onUpdate(editor.getJSON()), // → debounced save
  });
}
```

### Extension scope — MVP (Phase 2) vs Later

| Ship in Phase 2 | Defer (Phase 4) | Why defer |
|---|---|---|
| StarterKit (incl. history) | CodeBlockLowlight (syntax hl) | +lowlight+hljs ≈ 30 KB; not core |
| TaskList / TaskItem | Details (toggle blocks) | nice-to-have, not sticky-note core |
| Link (paste-aware) | Image paste → OPFS embed | needs blob storage design |
| Placeholder | DragHandle (⋮⋮ reorder) | has Yjs phantom-import build trap |
| Typography | Smart URL→`og:title` paste | needs a CF Worker proxy (no backend yet) |
| TextStyle + Color | Full command palette (Cmd+K) | bigger build; `/`-search covers v1 |

- **Pin the version.** Tiptap **v3** (current stable) — spec said v2; v3 is the
  right call (same vanilla API, better extensions, official Details later). Pin
  exact versions; the skill warns `@latest` ships breaking changes.
- **Bundle budget:** core + starter + 7 extensions ≈ **90–110 KB gzip**, under
  the UX-CHARTER `/app` < 200 KB ceiling. Lazy-load the editor chunk so the
  sidebar paints first.
- **Floating toolbar:** vanilla `BubbleMenu` extension, `shouldShow` on text
  selection — bold/italic/strike/code/link/color. No right-click menu in v1.

---

## §5 · Search algorithm — naive substring (no library) ⭐

SPEC Decision stands. For < 1000 notes, ranked substring over `plainText` is
**< 16 ms** (one frame).

```ts
function search(index: NoteIndexEntry[], q: string): NoteIndexEntry[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return index;
  return index
    .map(e => ({ e, score: rank(e, needle) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.e);
}
// rank: title match > preview match; earlier position = higher; pinned tiebreak.
```

- Search runs over the **light index** (title + preview), not full docs — fast,
  already in memory.
- **Escape hatch:** if a user ever has 5k+ notes, drop in **MiniSearch** (~6 KB,
  prefix + fuzzy + BM25). Interface (`search(index, q)`) stays identical. Not
  worth it for v1.
- `/` focuses search; `Esc` clears + unfocuses. Highlight matched substring in
  sidebar via `<mark>`.

---

## §6 · Undo strategy — Tiptap history + 5 s delete-undo (no journal) ⭐

Two distinct undo needs, two right-sized tools:

1. **In-note text undo/redo:** Tiptap StarterKit's built-in `history`
   (`Cmd+Z` / `Cmd+Shift+Z`). Per-note, automatic, free. Nothing to build.
2. **Note deletion undo:** UX-CHARTER §power-user spec → "delete with confirm
   toast + 5 s undo." Implement as **soft-delete window**, not a journal:
   - `deleteNote(id)` removes from in-memory `index` immediately (optimistic),
     stashes the full `Note` in a `pendingDelete` var, shows one toast
     "Note deleted · **Undo**" with a 5 s timer.
   - Undo → restore to store + re-render. Timeout → `adapter.remove(id)` (hard).
   - Navigating away / deleting another note flushes the pending hard-delete
     first (one at a time — UX-CHARTER: toasts replace, never stack).

No custom global journal — it'd be over-engineering (YAGNI) for two operations
that have purpose-built solutions.

---

## §7 · Cross-tab sync protocol — BroadcastChannel (metadata only) 📡

Storage (IDB/OPFS) is already shared across same-origin tabs, so we broadcast
**"what changed," never content.** The other tab re-reads from storage.

```ts
// src/lib/crossTabSync.ts
const MY_TAB = crypto.randomUUID();           // echo-guard origin id
const ch = new BroadcastChannel("aotn:notes");

type SyncMsg =
  | { t: "put";    id: string; updatedAt: number; origin: string }
  | { t: "remove"; id: string; origin: string }
  | { t: "relist"; origin: string };          // pin/color/reorder → refresh list

export function broadcast(m: Omit<SyncMsg,"origin">) {
  ch.postMessage({ ...m, origin: MY_TAB });
}

ch.onmessage = (ev) => {
  const m = ev.data as SyncMsg;
  if (m.origin === MY_TAB) return;            // ignore our own echoes
  // "put": if m.updatedAt > local.updatedAt → re-read note from storage, patch store
  // "remove": drop from index (+ if active, show "deleted in another tab" state)
  // "relist": adapter.list() → refresh sidebar
};
```

**Design rules:**
- **Echo-guard** via `MY_TAB` id — prevents A→broadcast→B→broadcast→A loops.
- **Last-write-wins** by `updatedAt`. Messages carry the timestamp so a stale
  echo can't clobber a newer local edit.
- **Tiny messages** (id + ts) — never serialize the doc onto the wire.
- Wrap `onmessage` body in `try/catch` (FTN piggyback pattern) — a malformed
  message must never crash the editor.

**Known v1 limitation (flag, don't fix yet):** if the *same* note is open and
edited in two tabs simultaneously, last-saver wins and the other's in-flight
keystrokes are lost. Acceptable for single-user v1. Phase 4 could add a "note
changed in another tab — reload?" banner. Out of scope now.

---

## §8 · Keyboard map (Phase 2 subset)

Full map lives in UX-CHARTER §power-user; Phase 2 ships the non-PiP, non-export
subset. Editor formatting keys (Cmd+B/I/etc.) are handled natively by Tiptap.

| Key | Action | Notes |
|---|---|---|
| `N` (when not typing) | New note | guard: ignore if focus is in editor/input |
| `/` (when not typing) | Focus search | |
| `Esc` | Clear+unfocus search, or blur editor | context-aware |
| `Cmd/Ctrl + S` | "Force save" | already autosaved; flashes "Saved ✓" for reassurance |
| `Cmd/Ctrl + Backspace` | Delete current note | → 5 s undo toast (§6) |
| `J` / `K` | Navigate notes down/up | vim-style; only when not typing |
| `?` | Keyboard shortcuts modal | reuses the list above |
| `Cmd/Ctrl + Z` / `+Shift+Z` | Undo / redo (in note) | Tiptap native |

**Deferred to later phases:** `Cmd+K` command palette (Phase 4),
`Cmd+Shift+E` export ZIP (Phase 4), `Cmd+Shift+P` pop-to-PiP (Phase 3),
`Cmd+D` duplicate (Phase 4).

The `when not typing` guard = bail if
`document.activeElement` is an input/textarea or inside `.ProseMirror`.

---

## §9 · The 6-commit plan (dependency-ordered, each independently shippable)

Matches SPEC-v0.1 commits 6–11, refined with explicit can-stop checkpoints.
One feature = one commit = live on CF Pages ~90 s after push.

| # | Commit | Ships | ✋ Can stop here? |
|---|---|---|---|
| **6** | `feat(app): two-pane shell + in-memory CRUD` | `/app` route, sidebar list, create/select/delete, search box (UI), DESIGN-grade sticky cards w/ micro-rotation + shadow. **In-memory only.** | ✅ Usable scratchpad (loses data on reload) |
| **7** | `feat(notes): persistence + reactive store` | `StorageAdapter` (IDB primary), `notesStore`, derive title/plainText, optimistic save, recovery. **Notes survive reload.** | ✅ Real durable notepad |
| **8** | `feat(editor): Tiptap vanilla + floating toolbar + autosave` | wire `makeEditor`, BubbleMenu, debounced 500 ms save, "Saving…/Saved ✓" indicator. **Rich text persisted.** | ✅ The core product works |
| **9** | `feat(notes): 8-color picker + paper texture + cross-tab sync` | color swatches (DESIGN §2), paper-noise overlay, sticky shadow stack, BroadcastChannel. **Full sticky look + multi-tab consistency.** | ✅ Looks + feels like sticky notes |
| **10** | `feat(notes): full-text search + pin` | ranked substring search, `/` focus, `<mark>` highlight, pin→top grouping. **Findable + organizable.** | ✅ Scales past a handful of notes |
| **11** | `feat(app): undo polish + empty states + keymap + sample note` | 5 s delete-undo, `?` shortcuts modal, J/K nav, "empty fridge" state, welcome sample note (UX-CHARTER §empty). **Phase 2 complete.** | ✅ Notion-grade Phase 2 done |

**Dependency order is strict:** 6→7 (store before persist), 7→8 (persist before
editor autosave), 8→9 (editor before color/sync touch the doc), 9→10
(sync before pin-broadcast), 10→11 (search/pin before polish). No reordering.

After commit 11 we **stop and field-test** before Phase 3 (PiP) — per your
"pause after ~10 commits, real-device test protocol-touching features" rule.

---

## §10 · File manifest (new files this phase)

```
src/pages/app.astro                  # the page + big client <script> island
src/lib/types.ts                     # Note, NoteIndexEntry, StickyColor (FROZEN v1)
src/lib/emitter.ts                   # COPIED from FTN
src/lib/notesStore.ts                # reactive store + optimistic mutations
src/lib/storage/types.ts             # StorageAdapter interface
src/lib/storage/idbAdapter.ts        # IndexedDB impl (idb) — primary
src/lib/storage/opfsAdapter.ts       # OPFS impl — only if §0 keeps OPFS
src/lib/tiptapSetup.ts               # vanilla Editor factory + extensions
src/lib/searchNotes.ts               # ranked substring search
src/lib/crossTabSync.ts              # BroadcastChannel protocol
src/lib/colors.ts                    # StickyColor → CSS var map (DESIGN §2)
src/lib/keymap.ts                    # global key handler (guarded)
src/components/app/Sidebar.astro     # static shell (hydrated by the island)
src/components/app/EditorPane.astro  # static shell
public/assets/paper-noise.svg        # <1 KB texture (UX-CHARTER §3)
```

New deps (pinned): `@tiptap/core` `@tiptap/starter-kit` `@tiptap/extension-task-list`
`@tiptap/extension-task-item` `@tiptap/extension-link`
`@tiptap/extension-placeholder` `@tiptap/extension-typography`
`@tiptap/extension-text-style` `@tiptap/extension-color`
`@tiptap/extension-bubble-menu` · `idb` (if IDB primary).

---

## §11 · Open questions (need your call)

1. **Storage: IndexedDB-primary (my ⭐) or keep OPFS?** (§0) — the one real
   decision. Everything else is storage-agnostic.
2. **Tiptap v3 instead of spec'd v2?** (§4) — recommend yes; trivial, current
   stable, better forward path. Just confirming.
3. Anything in the 6-commit slicing you want re-cut before I start?

---

## ⏭️ Approval workflow

- **"Approve"** → I take IDB-primary + Tiptap v3 + the 6-commit plan as written,
  and ship **commit 6** immediately. You advance with **"next"** per commit.
- **"Approve except storage: keep OPFS"** (or any single override) → I adjust
  that one thing and ship.
- **"Hold — discuss [N]"** → we drill in.

Each commit: `npm run build` (0 errors) → `npx astro check` (green) → push →
"live in ~90 s" + what-you-got bullets.
