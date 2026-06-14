/**
 * Note migration / defensive read — Phase 2 commit 7.
 *
 * Every record loaded from PERSISTENT storage passes through `migrateNote`
 * before the app trusts it. This does two jobs:
 *
 *  1. Robustness — a malformed or partial record (corrupted storage, a bug in
 *     an older build, a half-written note) is coerced to a valid Note with
 *     sensible defaults instead of crashing the editor. Unrecoverable records
 *     (no id) return null and are skipped.
 *
 *  2. Forward migration — this is the seam that makes the FROZEN, add-only
 *     schema promise real. When SCHEMA_VERSION bumps and a new optional field
 *     is added, an old record missing that field gets the default here. Add a
 *     `if (r.v < N)` block per version step as the schema evolves. The note is
 *     re-stamped to the current SCHEMA_VERSION; it gets re-persisted in that
 *     shape the next time the user edits it (migrate-on-read, write-on-next-edit
 *     — no boot-time write amplification).
 */
import {
  type Note,
  type JSONContent,
  SCHEMA_VERSION,
  DEFAULT_COLOR,
  isStickyColor,
} from "./types";
import { emptyDoc, deriveTitle } from "./docText";

export function migrateNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null; // unrecoverable — skip

  const updatedAt = typeof r.updatedAt === "number" ? r.updatedAt : Date.now();
  const createdAt = typeof r.createdAt === "number" ? r.createdAt : updatedAt;
  const plainText = typeof r.plainText === "string" ? r.plainText : "";
  const doc = (r.doc && typeof r.doc === "object" ? r.doc : emptyDoc()) as JSONContent;

  const note: Note = {
    id: r.id,
    v: SCHEMA_VERSION, // re-stamp to current
    doc,
    plainText,
    title:
      typeof r.title === "string" && r.title.length > 0
        ? r.title
        : deriveTitle(plainText),
    color: isStickyColor(r.color) ? r.color : DEFAULT_COLOR,
    pinned: r.pinned === true,
    createdAt,
    updatedAt,
  };

  // Optional fields — only set when present + valid (keeps records lean).
  if (typeof r.pipWidth === "number") note.pipWidth = r.pipWidth;
  if (typeof r.pipHeight === "number") note.pipHeight = r.pipHeight;

  return note;
}
