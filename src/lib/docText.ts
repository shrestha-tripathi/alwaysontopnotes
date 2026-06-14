/**
 * Document helpers — bridge between plain text and the Tiptap-shaped `doc`.
 *
 * In commit 6 the editor is a plain <textarea>, but we persist the body as a
 * Tiptap document (`{type:"doc", content:[paragraph…]}`). That means when the
 * real Tiptap editor is wired in commit 8, every note created today loads with
 * ZERO migration — `editor.getJSON()` produces the same shape we already store.
 *
 * The transforms are intentionally simple (paragraph-per-line). Tiptap will
 * replace `textToDoc` as the authoring path; `docToText` stays forever as the
 * canonical "flatten any doc to searchable text" function.
 */
import type { JSONContent } from "./types";

/** An empty Tiptap document (one empty paragraph). */
export function emptyDoc(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/**
 * Plain text → Tiptap doc. Each non-empty line becomes a paragraph; blank
 * lines become empty paragraphs so round-tripping preserves spacing.
 */
export function textToDoc(text: string): JSONContent {
  const lines = text.split("\n");
  const content: JSONContent[] = lines.map((line) =>
    line.length
      ? { type: "paragraph", content: [{ type: "text", text: line }] }
      : { type: "paragraph" },
  );
  if (content.length === 0) content.push({ type: "paragraph" });
  return { type: "doc", content };
}

/**
 * Tiptap doc → plain text. Recursively concatenates all `text` nodes, inserting
 * a newline between block-level nodes. Robust to any node type (so it keeps
 * working when commit 8 adds headings, lists, checkboxes, code blocks, etc.).
 */
export function docToText(doc: JSONContent | null | undefined): string {
  if (!doc) return "";
  const BLOCK = new Set([
    "paragraph",
    "heading",
    "listItem",
    "taskItem",
    "blockquote",
    "codeBlock",
  ]);
  const out: string[] = [];

  const walk = (node: JSONContent): void => {
    if (typeof node.text === "string") out.push(node.text);
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child);
    }
    if (node.type && BLOCK.has(node.type)) out.push("\n");
  };

  walk(doc);
  // Collapse the trailing newlines we appended, trim outer whitespace.
  return out.join("").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Derive a note title from flattened text: first non-empty trimmed line,
 * capped at 80 chars. Never user-set — always recomputed on save (SPEC §2).
 */
export function deriveTitle(plainText: string): string {
  const firstLine = plainText
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!firstLine) return "Untitled";
  return firstLine.length > 80 ? firstLine.slice(0, 80) : firstLine;
}
