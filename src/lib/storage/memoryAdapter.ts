/**
 * In-memory StorageAdapter — Phase 2 commit 6.
 *
 * Implements the full StorageAdapter contract against a plain Map, so the
 * store + UI are exercised end-to-end through the EXACT interface that the
 * real IndexedDB adapter (commit 7) and any future OPFS / sqlite-wasm adapter
 * implement. The only thing this backend lacks is persistence — notes vanish
 * on reload. Swapping in a durable backend changes one line in `index.ts`.
 *
 * Async (despite being synchronous internally) on purpose: every adapter must
 * present the same async surface so they're drop-in interchangeable.
 */
import type { Note, NoteIndexEntry } from "../types";
import { toIndexEntry } from "../types";
import type { StorageAdapter } from "./types";

export function makeMemoryAdapter(): StorageAdapter {
  const map = new Map<string, Note>();

  return {
    kind: "memory",

    async list(): Promise<NoteIndexEntry[]> {
      return [...map.values()].map(toIndexEntry);
    },

    async get(id: string): Promise<Note | null> {
      const n = map.get(id);
      // Defensive deep clone so callers can't mutate our stored copy in place.
      return n ? structuredClone(n) : null;
    },

    async put(note: Note): Promise<void> {
      map.set(note.id, structuredClone(note));
    },

    async remove(id: string): Promise<void> {
      map.delete(id);
    },

    async recover(): Promise<void> {
      // Nothing to heal — the Map IS the source of truth.
    },
  };
}
