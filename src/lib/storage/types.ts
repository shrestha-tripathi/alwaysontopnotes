/**
 * Storage abstraction — the seam that keeps our options open.
 *
 * The notes store talks ONLY to this interface, never to a concrete backend.
 * That means swapping where notes live is a one-line change at boot
 * (`pickStorage()` in `index.ts`) and touches nothing else:
 *
 *   Phase 2 commit 6 → memoryAdapter   (in-memory; lost on reload)
 *   Phase 2 commit 7 → idbAdapter      (IndexedDB; survives reload)  ← primary
 *   Phase 5 (maybe)  → opfsAdapter      (OPFS file-per-note)
 *   Phase 5 (maybe)  → sqliteAdapter    (sqlite-wasm over OPFS, FTS)
 *
 * Design rules every adapter MUST honor:
 *  - All methods are async (even memory) so backends are interchangeable.
 *  - `list()` returns the LIGHT projection only — never deserialize full docs
 *    to render the sidebar. This is what keeps listing fast at scale.
 *  - `get()` lazily loads a single full note (with its Tiptap doc).
 *  - `put()` is idempotent on `note.id` (create == update).
 *  - `recover()` heals a derived index from the source of truth. For stores
 *    that can't drift (IndexedDB) it's a no-op; for OPFS it re-scans the dir.
 */
import type { Note, NoteIndexEntry } from "../types";

export interface StorageAdapter {
  /** Human-readable backend name, for diagnostics ("memory" | "idb" | …). */
  readonly kind: string;

  /** Lightweight list for the sidebar. MUST NOT load full docs. */
  list(): Promise<NoteIndexEntry[]>;

  /** Full note (with Tiptap doc), or null if it doesn't exist. */
  get(id: string): Promise<Note | null>;

  /** Create-or-update. Idempotent on `note.id`. */
  put(note: Note): Promise<void>;

  /** Hard delete. (Soft-delete + undo live in the store layer, not here.) */
  remove(id: string): Promise<void>;

  /**
   * Rebuild any derived index from the source of truth. No-op for backends
   * that can't drift (IndexedDB). OPFS re-scans `notes/` to heal `_index.json`.
   */
  recover(): Promise<void>;
}
