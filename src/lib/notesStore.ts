/**
 * notesStore — the reactive single source of truth for /app.
 *
 * The UI (sidebar + editor) subscribes to `change` and re-renders. Every
 * mutation is OPTIMISTIC: we update in-memory state and emit IMMEDIATELY, then
 * persist through the StorageAdapter in the background (UX-CHARTER: no spinners,
 * instant feedback). Persistence failures surface a toast but never block UI.
 *
 * Storage-agnostic — holds a `StorageAdapter` from `init()` and never knows if
 * that's memory / IndexedDB / OPFS.
 *
 * ── Memory model (commit 7) ──────────────────────────────────────────────
 * Two in-memory maps mirror the adapter's two-store split, so boot is cheap
 * even with thousands of notes:
 *
 *   indexMap : Map<id, NoteIndexEntry>  — LIGHT. Complete. The list's truth.
 *                                          Loaded fully on init (cheap: title +
 *                                          preview only, no Tiptap docs).
 *   docCache : Map<id, Note>            — HEAVY. Sparse. Full docs, lazy-loaded
 *                                          from the adapter on select / mutate,
 *                                          and held for the session.
 *
 * Listing never needs a full doc; editing one note loads exactly one doc.
 *
 * Phase 2 scope: owns CRUD + selection + search query + soft 5s delete-undo
 * (commit 11 polishes the toast). Does NOT own cross-tab sync (commit 9) or the
 * Tiptap editor (commit 8).
 */
import { Emitter } from "./emitter";
import {
  type Note,
  type NoteIndexEntry,
  type StickyColor,
  DEFAULT_COLOR,
  SCHEMA_VERSION,
  compareForList,
  toIndexEntry,
} from "./types";
import { emptyDoc, textToDoc, docToText, deriveTitle } from "./docText";
import type { StorageAdapter } from "./storage/types";
import { broadcast, subscribe, type InboundMsg } from "./crossTabSync";

export interface NotesState {
  /** Sidebar list (already sorted: pinned first, then updatedAt desc). */
  index: NoteIndexEntry[];
  /** Currently selected note id (or null = nothing selected). */
  activeId: string | null;
  /** Full doc of the selected note (lazily loaded). */
  active: Note | null;
  /** Search box query. */
  query: string;
  /** True while a background persist is in flight (drives "Saving…/Saved"). */
  saving: boolean;
  /** True once init() has loaded the initial list. */
  ready: boolean;
}

/** A note pending hard-delete, kept for the 5s undo window (SPEC §6). */
interface PendingDelete {
  note: Note;
  timer: ReturnType<typeof setTimeout>;
}

const now = (): number => Date.now();
const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `n_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

class NotesStore {
  readonly emitter = new Emitter<{
    change: NotesState;
    /** A note was soft-deleted; UI shows the undo toast. */
    pendingDelete: { id: string; title: string };
    /** A background persist failed; UI shows a retry toast. */
    error: { message: string };
    /** A non-error info toast (e.g. "this note was deleted in another tab"). */
    notice: { message: string };
    /** A sibling tab edited the CURRENTLY-ACTIVE note; the view reloads the
     *  editor body IF the user isn't mid-edit (idle). Carries the fresh doc. */
    remoteActive: { id: string; doc: Note["doc"] };
  }>();

  private adapter: StorageAdapter | null = null;
  /** LIGHT, complete — the sidebar list's source of truth. */
  private indexMap = new Map<string, NoteIndexEntry>();
  /** HEAVY, sparse — full docs lazily loaded on demand and cached. */
  private docCache = new Map<string, Note>();
  private pending: PendingDelete | null = null;
  /** Tear-down handle for the cross-tab BroadcastChannel listener. */
  private unsubscribeSync: (() => void) | null = null;

  private state: NotesState = {
    index: [],
    activeId: null,
    active: null,
    query: "",
    saving: false,
    ready: false,
  };

  /** Snapshot accessor (read-only copy). */
  get(): NotesState {
    return { ...this.state };
  }

  private emit(): void {
    this.emitter.emit("change", this.get());
  }

  private setState(patch: Partial<NotesState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  /** Recompute the sorted sidebar index from the LIGHT index map. */
  private reindex(): NoteIndexEntry[] {
    return [...this.indexMap.values()].sort(compareForList);
  }

  /**
   * Record a note into both in-memory tiers (light index + heavy cache).
   * Single place that keeps the two maps consistent on every mutation.
   */
  private track(note: Note): void {
    this.docCache.set(note.id, note);
    this.indexMap.set(note.id, toIndexEntry(note));
  }

  private untrack(id: string): void {
    this.docCache.delete(id);
    this.indexMap.delete(id);
  }

  // ── lifecycle ───────────────────────────────────────────────────────

  async init(adapter: StorageAdapter): Promise<void> {
    this.adapter = adapter;
    await adapter.recover();
    // Load ONLY the light index — no full docs. This is the whole point of the
    // two-store design: boot cost is O(note count) in light entries, not in
    // deserialized Tiptap documents.
    const list = await adapter.list();
    this.indexMap.clear();
    for (const entry of list) this.indexMap.set(entry.id, entry);
    this.setState({ index: this.reindex(), ready: true });
    // Start listening for changes made in OTHER tabs (idempotent re-init safe).
    this.unsubscribeSync?.();
    this.unsubscribeSync = subscribe((m) => void this.applyRemote(m));
  }

  /**
   * Apply a change that happened in ANOTHER tab (SPEC-Phase2 §7). Storage is
   * already shared, so we re-read the canonical record and patch our in-memory
   * tiers — we never receive content over the wire, only an id + timestamp.
   *
   * Last-write-wins by `updatedAt`: a stale echo that lost a race is ignored,
   * so a remote message can't clobber a newer local edit. Fully defensive —
   * any failure is swallowed so a sibling tab can never crash this one.
   */
  private async applyRemote(m: InboundMsg): Promise<void> {
    if (!this.adapter) return;
    try {
      if (m.t === "remove") {
        // Don't drop a note we're mid-soft-deleting locally (our own undo
        // window owns it); the local timer will hard-delete + re-broadcast.
        if (this.pending?.note.id === m.id) return;
        if (!this.indexMap.has(m.id)) return; // already gone here
        const wasActive = this.state.activeId === m.id;
        this.untrack(m.id);
        this.setState({
          index: this.reindex(),
          activeId: wasActive ? null : this.state.activeId,
          active: wasActive ? null : this.state.active,
        });
        if (wasActive) {
          this.emitter.emit("notice", {
            message: "This note was deleted in another tab.",
          });
        }
        return;
      }

      // t === "put": re-read the canonical record and merge if it's newer.
      const local = this.indexMap.get(m.id);
      if (local && local.updatedAt >= m.updatedAt) return; // our copy is newer/equal
      const fresh = await this.adapter.get(m.id);
      if (!fresh) return; // vanished between broadcast and read — ignore
      this.track(fresh);
      this.setState({
        index: this.reindex(),
        // If the user is viewing this note, refresh the shown copy in state.
        active: this.state.activeId === m.id ? fresh : this.state.active,
      });
      // Tell the view to reload the editor body — but only the VIEW knows if the
      // user is mid-edit (it owns the debounce), so it gates the actual reload.
      // (Concurrent same-note typing stays a flagged v1 limitation — §7.)
      if (this.state.activeId === m.id) {
        this.emitter.emit("remoteActive", { id: m.id, doc: fresh.doc });
      }
    } catch (err) {
      console.error("[notesStore] applyRemote failed:", err);
    }
  }

  // ── persistence ─────────────────────────────────────────────────────

  private async persist(note: Note): Promise<void> {
    if (!this.adapter) return;
    this.setState({ saving: true });
    try {
      await this.adapter.put(note);
      // Tell sibling tabs to re-read this note (id + ts only — never content).
      broadcast({ t: "put", id: note.id, updatedAt: note.updatedAt });
    } catch (err) {
      this.emitter.emit("error", {
        message: "Couldn't save note — changes are in memory only.",
      });
      console.error("[notesStore] persist failed:", err);
    } finally {
      this.setState({ saving: false });
    }
  }

  /** Resolve a full note: cache hit, else lazy-load from the adapter. */
  private async load(id: string): Promise<Note | null> {
    const cached = this.docCache.get(id);
    if (cached) return cached;
    if (!this.adapter) return null;
    const full = await this.adapter.get(id);
    if (full) this.docCache.set(id, full);
    return full;
  }

  // ── mutations (all optimistic) ──────────────────────────────────────

  /** Create a blank note, select it, persist in the background. */
  async createNote(color: StickyColor = DEFAULT_COLOR): Promise<string> {
    const ts = now();
    const note: Note = {
      id: uuid(),
      v: SCHEMA_VERSION,
      doc: emptyDoc(),
      plainText: "",
      title: "Untitled",
      color,
      pinned: false,
      createdAt: ts,
      updatedAt: ts,
    };
    this.track(note);
    this.setState({
      index: this.reindex(),
      activeId: note.id,
      active: note,
    });
    void this.persist(note);
    return note.id;
  }

  /**
   * Seed a note from a pre-built rich doc (e.g. the first-run welcome note).
   * Unlike createNote (blank), this persists a full doc and derives title/
   * plainText from it. Selects it so the user lands on real content. Returns
   * the new id.
   */
  async seedNote(doc: Note["doc"], color: StickyColor = DEFAULT_COLOR): Promise<string> {
    const ts = now();
    const plainText = docToText(doc);
    const note: Note = {
      id: uuid(),
      v: SCHEMA_VERSION,
      doc,
      plainText,
      title: deriveTitle(plainText),
      color,
      pinned: false,
      createdAt: ts,
      updatedAt: ts,
    };
    this.track(note);
    this.setState({
      index: this.reindex(),
      activeId: note.id,
      active: note,
    });
    void this.persist(note);
    return note.id;
  }

  /**
   * Load EVERY note with its full doc — for bulk export only. Unlike the
   * sidebar's light index, this deliberately deserializes all docs (a user-
   * initiated, infrequent action, not a render path). Order matches the
   * current sorted sidebar so the export is predictable. Cache hits are reused;
   * misses fetch from the adapter once.
   */
  async getAllNotes(): Promise<Note[]> {
    const ordered = this.reindex();
    const out: Note[] = [];
    for (const entry of ordered) {
      const full = await this.load(entry.id);
      if (full) out.push(full);
    }
    return out;
  }

  /** Select a note (lazy-loads its full doc from cache or adapter). */
  async selectNote(id: string | null): Promise<void> {
    if (id === null) {
      this.setState({ activeId: null, active: null });
      return;
    }
    const note = await this.load(id);
    // Guard against a race where the note was deleted while loading.
    if (!this.indexMap.has(id)) return;
    this.setState({ activeId: id, active: note });
  }

  /**
   * Update the active note's body from raw text (commit 6 textarea path).
   * Commit 8 replaces this with `updateActiveDoc(json)` from Tiptap; both
   * funnel through the same derive-and-persist core.
   */
  async updateActiveText(text: string): Promise<void> {
    if (!this.state.active) return;
    await this.writeActive({ doc: textToDoc(text), plainText: text });
  }

  /** Update the active note's doc directly (Tiptap path, commit 8). */
  async updateActiveDoc(doc: Note["doc"]): Promise<void> {
    if (!this.state.active) return;
    await this.writeActive({ doc, plainText: docToText(doc) });
  }

  /** Shared core: apply doc/plainText to the active note, derive, persist. */
  private async writeActive(patch: Pick<Note, "doc" | "plainText">): Promise<void> {
    const cur = this.state.active;
    if (!cur) return;
    const updated: Note = {
      ...cur,
      doc: patch.doc,
      plainText: patch.plainText,
      title: deriveTitle(patch.plainText),
      updatedAt: now(),
    };
    this.track(updated);
    this.setState({ active: updated, index: this.reindex() });
    void this.persist(updated);
  }

  /** Change a note's color. (Lazy-loads the full doc if not cached.) */
  async setColor(id: string, color: StickyColor): Promise<void> {
    const note = await this.load(id);
    if (!note) return;
    const updated: Note = { ...note, color, updatedAt: now() };
    this.track(updated);
    this.setState({
      index: this.reindex(),
      active: this.state.activeId === id ? updated : this.state.active,
    });
    void this.persist(updated);
  }

  /** Toggle pinned. (Lazy-loads the full doc if not cached.) */
  async togglePin(id: string): Promise<void> {
    const note = await this.load(id);
    if (!note) return;
    const updated: Note = { ...note, pinned: !note.pinned, updatedAt: now() };
    this.track(updated);
    this.setState({
      index: this.reindex(),
      active: this.state.activeId === id ? updated : this.state.active,
    });
    void this.persist(updated);
  }

  /**
   * Persist a note's PiP window size (Phase 3 · commit 13). A window resize is
   * NOT a content edit, so this deliberately does NOT bump `updatedAt` (would
   * reorder the recency list + lose cross-tab last-write-wins races), does NOT
   * broadcast (size is per-device, not shared content), and does NOT flip the
   * `saving` flag (no spurious "Saved ✓" flash on drag-resize). It writes the
   * full record quietly so the size reloads on the next pop-out of this note.
   */
  async updateNoteSize(id: string, pipWidth: number, pipHeight: number): Promise<void> {
    const note = await this.load(id);
    if (!note) return;
    if (note.pipWidth === pipWidth && note.pipHeight === pipHeight) return; // no-op
    const updated: Note = { ...note, pipWidth, pipHeight };
    this.track(updated);
    if (this.state.activeId === id) this.setState({ active: updated });
    if (!this.adapter) return;
    try {
      await this.adapter.put(updated); // quiet: no broadcast, no saving flag
    } catch (err) {
      console.error("[notesStore] updateNoteSize persist failed:", err);
    }
  }

  /**
   * Soft-delete with a 5s undo window (SPEC §6). Removes from the index
   * immediately; the hard delete fires after 5s unless `undoDelete()` is
   * called. Deleting a second note flushes the first pending hard-delete.
   *
   * Synchronous on the common path: delete only targets the ACTIVE note, which
   * is always in the doc cache (loaded on select), so the optimistic UI update
   * fires instantly with no await. The async branch is a defensive fallback for
   * a note that somehow isn't cached (no UI path triggers it in Phase 2).
   */
  deleteNote(id: string): void {
    const cached = this.docCache.get(id);
    if (cached) {
      this.commitDelete(cached);
    } else if (this.indexMap.has(id)) {
      // Rare: full doc not cached — load it (for the undo stash) then delete.
      void this.load(id).then((n) => {
        if (n) this.commitDelete(n);
      });
    }
  }

  /** Shared delete core: optimistic removal + 5s undo timer + toast event. */
  private commitDelete(note: Note): void {
    // Flush any prior pending delete first (one-at-a-time).
    this.flushPendingDelete();

    this.untrack(note.id);
    const stillActive = this.state.activeId === note.id;
    this.setState({
      index: this.reindex(),
      activeId: stillActive ? null : this.state.activeId,
      active: stillActive ? null : this.state.active,
    });

    const timer = setTimeout(() => {
      this.pending = null;
      if (this.adapter) {
        void this.adapter.remove(note.id);
        broadcast({ t: "remove", id: note.id });
      }
    }, 5000);
    this.pending = { note, timer };
    this.emitter.emit("pendingDelete", { id: note.id, title: note.title });
  }

  /** Restore the most recently soft-deleted note. */
  undoDelete(): void {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    const { note } = this.pending;
    this.pending = null;
    this.track(note);
    this.setState({ index: this.reindex() });
    void this.persist(note);
  }

  /** Force the pending hard-delete to happen now (e.g. before navigating). */
  flushPendingDelete(): void {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    const { note } = this.pending;
    this.pending = null;
    if (this.adapter) {
      void this.adapter.remove(note.id);
      broadcast({ t: "remove", id: note.id });
    }
  }

  /** Set the search query (filtering happens in the view via searchNotes). */
  setQuery(query: string): void {
    this.setState({ query });
  }
}

/** Singleton — one store per tab. */
export const notesStore = new NotesStore();
