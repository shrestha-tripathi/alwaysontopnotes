/**
 * Import orchestration — turn dropped/picked `.md` files into notes.
 *
 * Each file becomes one note via markdownToDoc() → store.seedNote(). Robust by
 * design: a file that fails to read or parse is skipped (counted), never throws,
 * so importing a folder of mixed files can't break the app. Returns a summary
 * the caller surfaces in a toast.
 */
import type { JSONContent } from "./types";
import { markdownToDoc } from "./markdown/parse";

export interface ImportSummary {
  imported: number;
  skipped: number;
}

/** Read a File as UTF-8 text (Promise wrapper around FileReader). */
function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** True for files we'll attempt to import (by extension or MIME). */
export function isMarkdownFile(file: File): boolean {
  return (
    /\.(md|markdown|mdown|mkd|txt)$/i.test(file.name) ||
    file.type === "text/markdown" ||
    file.type === "text/plain"
  );
}

/**
 * Import a list of files. `seed` is `store.seedNote` (doc → Promise<id>). Files
 * are processed sequentially so the seeded notes keep a stable order. Non-
 * markdown files are skipped. Empty docs are still imported (a blank note is a
 * valid outcome of importing an empty file).
 */
export async function importMarkdownFiles(
  files: File[],
  seed: (doc: JSONContent) => Promise<string>,
): Promise<ImportSummary> {
  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    if (!isMarkdownFile(file)) {
      skipped += 1;
      continue;
    }
    try {
      const text = await readText(file);
      const doc = markdownToDoc(text);
      await seed(doc);
      imported += 1;
    } catch {
      skipped += 1;
    }
  }

  return { imported, skipped };
}
