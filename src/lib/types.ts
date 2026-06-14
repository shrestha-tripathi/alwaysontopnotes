/**
 * AlwaysOnTopNotes — core data types.
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  V1 SCHEMA — FROZEN.  (see specs/SPEC-Phase2.md §2)                 ║
 * ║                                                                    ║
 * ║  Ship this shape once, then NEVER remove or rename a field.        ║
 * ║  Forward evolution is ADD-ONLY: add an OPTIONAL field, bump         ║
 * ║  SCHEMA_VERSION, and write a migration in the storage adapter's     ║
 * ║  upgrade path. A persisted note may have been written by an older   ║
 * ║  build, so every reader must tolerate missing optional fields.      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

/** Bump ONLY when adding fields + providing a migration. Currently 1. */
export const SCHEMA_VERSION = 1 as const;

/**
 * Minimal structural mirror of Tiptap's `JSONContent`. We define it locally so
 * the storage + store layers carry NO Tiptap dependency (Tiptap is wired in
 * commit 8). When the real editor lands, `editor.getJSON()` returns a value
 * that is structurally assignable to this type — existing notes load as-is.
 */
export interface JSONContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
  [key: string]: unknown;
}

/**
 * The 8 sticky-note colors (DESIGN.md §2 / UX-CHARTER §3). The string union IS
 * the frozen contract — persisted notes store one of these literals. Add a new
 * color = add a union member (safe, additive) + a `colors.ts` entry.
 */
export type StickyColor =
  | "yellow"
  | "pink"
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "gray"
  | "cream";

export const DEFAULT_COLOR: StickyColor = "yellow";

/**
 * Runtime list of valid colors — source of truth for the `StickyColor` union
 * at runtime (the type itself erases at compile time). Kept here in the schema
 * module so persistence-layer validation has a canonical reference.
 */
export const STICKY_COLORS: readonly StickyColor[] = [
  "yellow",
  "pink",
  "blue",
  "green",
  "orange",
  "purple",
  "gray",
  "cream",
];

/** Type guard: is an arbitrary value one of the known sticky colors? */
export function isStickyColor(v: unknown): v is StickyColor {
  return typeof v === "string" && (STICKY_COLORS as readonly string[]).includes(v);
}

/** A full note, including its rich-text document. Loaded lazily on select. */
export interface Note {
  /** Stable id; `crypto.randomUUID()`. Never reused, never changes. */
  id: string;
  /** SCHEMA_VERSION this record was written with (for migrations). */
  v: number;
  /** Tiptap-shaped document — the content source of truth. */
  doc: JSONContent;
  /** Flattened text; DERIVED from `doc` on every save. Drives search + title. */
  plainText: string;
  /** First non-empty line of plainText (≤ 80 chars). DERIVED — never user-set. */
  title: string;
  color: StickyColor;
  pinned: boolean;
  /** Per-note Document-PiP size. Phase 3 reads these; harmless to carry now. */
  pipWidth?: number;
  pipHeight?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Lightweight projection for rendering the sidebar list WITHOUT deserializing
 * full documents. `StorageAdapter.list()` returns these; full `Note`s are
 * fetched lazily via `get(id)` only when a note is selected.
 */
export interface NoteIndexEntry {
  id: string;
  title: string;
  color: StickyColor;
  pinned: boolean;
  updatedAt: number;
  /** First ~120 chars of plainText, for the card preview line. */
  preview: string;
}

/** Project the lightweight index entry from a full note. */
export function toIndexEntry(note: Note): NoteIndexEntry {
  return {
    id: note.id,
    title: note.title,
    color: note.color,
    pinned: note.pinned,
    updatedAt: note.updatedAt,
    preview: derivePreview(note.plainText),
  };
}

/**
 * Preview = the body text AFTER the title line, so the sidebar card doesn't
 * echo the title twice. A single-line note has no body → empty preview (the
 * card just shows its title, like Apple Notes / Notion). Capped at 120 chars.
 */
export function derivePreview(plainText: string): string {
  const lines = plainText.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim().length === 0) i++; // skip leading blanks
  i++; // skip the title line itself
  return lines.slice(i).join(" ").trim().slice(0, 120);
}

/**
 * Sort order for the sidebar: pinned first, then most-recently-updated.
 * Pure + stable so both the store and any adapter can reuse it.
 */
export function compareForList(a: NoteIndexEntry, b: NoteIndexEntry): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return b.updatedAt - a.updatedAt;
}
