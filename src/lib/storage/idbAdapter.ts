/**
 * IndexedDB StorageAdapter — Phase 2 commit 7. The PRIMARY backend.
 *
 * Replaces the in-memory adapter so notes survive reloads and stay consistent
 * across tabs (same-origin IndexedDB is shared; cross-tab change notification
 * arrives in commit 9 via BroadcastChannel). The store + UI are unchanged —
 * they only ever see the StorageAdapter interface.
 *
 * ── Two-store design (why) ───────────────────────────────────────────────
 * We keep TWO object stores, written atomically in one transaction per put:
 *
 *   "notes" — full Note records, keyed by id (includes the heavy Tiptap doc)
 *   "meta"  — light NoteIndexEntry records, keyed by id (title/preview/…)
 *
 * `list()` reads ONLY "meta", so rendering the sidebar never deserializes a
 * single Tiptap document — that's the interface contract ("list MUST NOT load
 * full docs") and what keeps listing fast as the note count grows. `get()`
 * lazily loads one full doc from "notes" on select.
 *
 * Because both writes happen in the SAME readwrite transaction, "meta" can
 * never drift from "notes" (IndexedDB transactions are atomic — both commit or
 * neither does). So `recover()` is a genuine no-op here, unlike OPFS.
 *
 * This split also maps 1:1 onto a future sqlite-wasm adapter: "meta" ≈
 * `SELECT id,title,preview,… ` (the list query) and "notes" ≈ `SELECT *`
 * (the single-row load). Migrating later stays a one-file change.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Note, NoteIndexEntry } from "../types";
import { toIndexEntry } from "../types";
import { migrateNote } from "../migrate";
import type { StorageAdapter } from "./types";

/** Bump ONLY when the object-store layout changes (NOT for note-field adds —
 *  those are handled by the per-record `Note.v` SCHEMA_VERSION + migrate-on-read). */
const DB_NAME = "aotn";
const DB_VERSION = 1;

interface AotnDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
  };
  meta: {
    key: string;
    value: NoteIndexEntry;
    indexes: { "by-updated": number };
  };
}

let dbPromise: Promise<IDBPDatabase<AotnDB>> | null = null;

function getDB(): Promise<IDBPDatabase<AotnDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AotnDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // oldVersion === 0 → fresh database.
        if (oldVersion < 1) {
          db.createObjectStore("notes", { keyPath: "id" });
          const meta = db.createObjectStore("meta", { keyPath: "id" });
          // Index lets us page the list by recency at scale without a full scan.
          meta.createIndex("by-updated", "updatedAt");
        }
        // Future store-shape migrations go here as `if (oldVersion < N)` blocks.
      },
      blocked() {
        console.warn("[idb] open blocked by another tab holding an old version");
      },
      blocking() {
        // Another tab wants to upgrade — close so it isn't stuck. We'll reopen
        // lazily on the next call.
        console.warn("[idb] closing to let another tab upgrade");
      },
    });
  }
  return dbPromise;
}

/**
 * Detect whether IndexedDB is actually usable. Some browsers expose
 * `window.indexedDB` but throw on open (Firefox private mode historically,
 * sandboxed iframes, disabled storage). We probe by opening for real.
 */
export async function idbAvailable(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try {
    await getDB();
    return true;
  } catch (err) {
    console.warn("[idb] unavailable, will fall back:", err);
    return false;
  }
}

export function makeIdbAdapter(): StorageAdapter {
  return {
    kind: "idb",

    async list(): Promise<NoteIndexEntry[]> {
      const db = await getDB();
      // Read the light store only — never touches the heavy "notes" docs.
      return db.getAll("meta");
    },

    async get(id: string): Promise<Note | null> {
      const db = await getDB();
      // Defensive read: coerce/migrate any persisted record to a valid current
      // Note (handles older builds + partial/corrupt records). null = skip.
      return migrateNote(await db.get("notes", id));
    },

    async put(note: Note): Promise<void> {
      const db = await getDB();
      // Atomic dual-write: full record + light projection in ONE transaction so
      // "meta" can never drift from "notes".
      const tx = db.transaction(["notes", "meta"], "readwrite");
      await Promise.all([
        tx.objectStore("notes").put(note),
        tx.objectStore("meta").put(toIndexEntry(note)),
        tx.done,
      ]);
    },

    async remove(id: string): Promise<void> {
      const db = await getDB();
      const tx = db.transaction(["notes", "meta"], "readwrite");
      await Promise.all([
        tx.objectStore("notes").delete(id),
        tx.objectStore("meta").delete(id),
        tx.done,
      ]);
    },

    async recover(): Promise<void> {
      // No-op: the dual-write transaction guarantees "meta" mirrors "notes".
      // (A future OPFS adapter re-scans the directory here; IDB can't drift.)
    },
  };
}
