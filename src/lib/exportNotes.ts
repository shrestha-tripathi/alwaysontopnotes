/**
 * Export orchestration — turn notes into downloadable Markdown.
 *
 *   exportNote(note)      → a single `<title>.md` download
 *   exportAllNotes(notes) → one `.zip` containing every note as `<title>.md`
 *
 * Markdown body is produced by docToMarkdown(); the `.zip` is streamed by
 * `client-zip` (tiny, MIT, no Node polyfills). All client-side — nothing leaves
 * the device, consistent with the privacy promise.
 */
import { downloadZip } from "client-zip";
import type { Note } from "./types";
import { docToMarkdown } from "./markdown/serialize";

/** Filesystem-safe slug from a note title (used for the `.md` filename). */
function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // strip punctuation/emoji
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return slug || "note";
}

/** Unique, collision-safe filename: `<slug>-<id6>.md`. */
function fileNameFor(note: Note): string {
  return `${slugify(note.title)}-${note.id.slice(0, 6)}.md`;
}

/**
 * Markdown for a single note. We DON'T prepend the title as an H1 — the title
 * is DERIVED from the first line of the body (SPEC §2), so the body's own first
 * line already is the title. Adding an H1 would duplicate it and, on re-import,
 * derive a doubled title.
 */
export function noteToMarkdown(note: Note): string {
  return docToMarkdown(note.doc);
}

/** Trigger a browser download of a Blob under `filename`. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the navigation has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download one note as a `.md` file. */
export function exportNote(note: Note): void {
  const blob = new Blob([noteToMarkdown(note)], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, fileNameFor(note));
}

/**
 * Download ALL notes as a single `.zip` (one `.md` per note). Filenames are
 * de-duplicated defensively — two notes that slug to the same name get a
 * numeric suffix so the archive never silently drops a file.
 */
export async function exportAllNotes(notes: Note[]): Promise<void> {
  const seen = new Map<string, number>();
  const files = notes.map((note) => {
    let name = fileNameFor(note);
    const count = seen.get(name) ?? 0;
    if (count > 0) name = name.replace(/\.md$/, `-${count}.md`);
    seen.set(fileNameFor(note), count + 1);
    return {
      name,
      lastModified: new Date(note.updatedAt),
      input: noteToMarkdown(note),
    };
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const blob = await downloadZip(files).blob();
  triggerDownload(blob, `alwaysontopnotes-${stamp}.zip`);
}
