/**
 * notesStore — the reactive single source of truth for /app.
 *
 * The UI (sidebar + editor) subscribes to `change` and re-renders. Every
 * mutation is OPTIMISTIC: we update the in-memory state and emit IMMEDIATELY,
 * then persist through the StorageAdapter in the background (UX-CHARTER: no
 * spinners, instant feedback). Persistence failures surface a toast but never
 * block the UI.
 *
 * The store is deliberately storage-agnostic — it holds a `StorageAdapter`
 * given at `init()` and never knows whether that's memory / IndexedDB / OPFS.
 *
 * Phase 2 scope note: this file owns CRUD + selection + search query + a soft
 * 5s delete-undo (commit 11 polishes the toast; the mechanism lives here). It
 * does NOT own cross-tab sync (commit 9 adds crossTabSync.ts which calls into
 * the public mutators) or the editor (commit 8).
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
  }>();

  private adapter: StorageAdapter | null = null;
  private notes = new Map<string, Note>(); // hot cache of full notes
  private pending: PendingDelete | null = null;

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

  /** Recompute the sorted sidebar index from the hot cache. */
  private reindex(): NoteIndexEntry[] {
    const index = [...this.notes.values()].map(toIndexEntry).sort(compareForList);
    return index;
  }

  // ── lifecycle ───────────────────────────────────────────────────────

  async init(adapter: StorageAdapter): Promise<void> {
    this.adapter = adapter;
    await adapter.recover();
    const list = await adapter.list();
    // Warm the hot cache. (Memory adapter is tiny; IDB commit 7 will lazy-load
    // full docs on select instead of eagerly — interface already supports it.)
    for (const entry of list) {
      const full = await adapter.get(entry.id);
      if (full) this.notes.set(full.id, full);
    }
    this.setState({ index: this.reindex(), ready: true });
  }

  // ── persistence ─────────────────────────────────────────────────────

  private async persist(note: Note): Promise<void> {
    if (!this.adapter) return;
    this.setState({ saving: true });
    try {
      await this.adapter.put(note);
    } catch (err) {
      this.emitter.emit("error", {
        message: "Couldn't save note — changes are in memory only.",
      });
      console.error("[notesStore] persist failed:", err);
    } finally {
      this.setState({ saving: false });
    }
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
    this.notes.set(note.id, note);
    this.setState({
      index: this.reindex(),
      activeId: note.id,
      active: note,
    });
    void this.persist(note);
    return note.id;
  }

  /** Select a note (loads full doc from cache; lazy from adapter if missing). */
  async selectNote(id: string | null): Promise<void> {
    if (id === null) {
      this.setState({ activeId: null, active: null });
      return;
    }
    let note = this.notes.get(id) ?? null;
    if (!note && this.adapter) {
      note = await this.adapter.get(id);
      if (note) this.notes.set(id, note);
    }
    this.setState({ activeId: id, active: note });
  }

  /**
   * Update the active note's body from raw text (commit 6 textarea path).
   * Commit 8 replaces this with `updateActiveDoc(json)` from Tiptap; both
   * funnel through the same derive-and-persist core.
   */
  async updateActiveText(text: string): Promise<void> {
    const cur = this.state.active;
    if (!cur) return;
    const doc = textToDoc(text);
    await this.writeActive({ doc, plainText: text });
  }

  /** Update the active note's doc directly (Tiptap path, commit 8). */
  async updateActiveDoc(doc: Note["doc"]): Promise<void> {
    const cur = this.state.active;
    if (!cur) return;
    const plainText = docToText(doc);
    await this.writeActive({ doc, plainText });
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
    this.notes.set(updated.id, updated);
    this.setState({ active: updated, index: this.reindex() });
    void this.persist(updated);
  }

  /** Change a note's color. */
  async setColor(id: string, color: StickyColor): Promise<void> {
    const note = this.notes.get(id);
    if (!note) return;
    const updated: Note = { ...note, color, updatedAt: now() };
    this.notes.set(id, updated);
    this.setState({
      index: this.reindex(),
      active: this.state.activeId === id ? updated : this.state.active,
    });
    void this.persist(updated);
  }

  /** Toggle pinned. */
  async togglePin(id: string): Promise<void> {
    const note = this.notes.get(id);
    if (!note) return;
    const updated: Note = { ...note, pinned: !note.pinned, updatedAt: now() };
    this.notes.set(id, updated);
    this.setState({
      index: this.reindex(),
      active: this.state.activeId === id ? updated : this.state.active,
    });
    void this.persist(updated);
  }

  /**
   * Soft-delete with a 5s undo window (SPEC §6). Removes from the index
   * immediately; the hard delete fires after 5s unless `undoDelete()` is
   * called. Deleting a second note flushes the first pending hard-delete.
   */
  deleteNote(id: string): void {
    const note = this.notes.get(id);
    if (!note) return;

    // Flush any prior pending delete first (one-at-a-time).
    this.flushPendingDelete();

    this.notes.delete(id);
    const nextActiveId =
      this.state.activeId === id ? null : this.state.activeId;
    this.setState({
      index: this.reindex(),
      activeId: nextActiveId,
      active: nextActiveId ? this.state.active : null,
    });

    const timer = setTimeout(() => {
      this.pending = null;
      if (this.adapter) void this.adapter.remove(id);
    }, 5000);
    this.pending = { note, timer };
    this.emitter.emit("pendingDelete", { id, title: note.title });
  }

  /** Restore the most recently soft-deleted note. */
  undoDelete(): void {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    const { note } = this.pending;
    this.pending = null;
    this.notes.set(note.id, note);
    this.setState({ index: this.reindex() });
    void this.persist(note);
  }

  /** Force the pending hard-delete to happen now (e.g. before navigating). */
  flushPendingDelete(): void {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    const { note } = this.pending;
    this.pending = null;
    if (this.adapter) void this.adapter.remove(note.id);
  }

  /** Set the search query (filtering happens in the view via searchNotes). */
  setQuery(query: string): void {
    this.setState({ query });
  }
}

/** Singleton — one store per tab. */
export const notesStore = new NotesStore();
