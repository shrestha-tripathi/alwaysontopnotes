/**
 * Tiptap doc → Markdown (CommonMark + GFM task lists).
 *
 * Hand-rolled ON PURPOSE (SPEC-Phase4 Decision A): our editor schema is small
 * and FROZEN (StarterKit v3 + TaskList/TaskItem + Typography), so a ~150-line
 * serializer gives a perfect round-trip with zero deps — the vanilla-Tiptap-v3
 * markdown libs are React-coupled / immature.
 *
 * Handles exactly:
 *   blocks  paragraph · heading(1-6) · bulletList · orderedList ·
 *           taskList(taskItem{checked}) · blockquote · codeBlock{language} ·
 *           horizontalRule · hardBreak
 *   marks   bold · italic · strike · code(inline) · link{href}
 *
 * LOSSLESS by design: the editor (tiptapSetup.ts) deliberately registers ONLY
 * marks/nodes that have a Markdown form — inline text color + underline were
 * removed precisely so doc → markdown → doc never drops user formatting. Legacy
 * `textStyle`/`color`/`underline` marks on old notes are stripped at read time
 * by migrateNote(), so they never reach this serializer. If you ever add a mark
 * to the editor, add its converter HERE (and in parse.ts) in the same change.
 */
import type { JSONContent } from "../types";

/** Characters that start/!break Markdown block or inline syntax in a text run. */
function escapeText(text: string): string {
  // Escape only what would be mis-parsed as markup if left raw. Intentionally
  // conservative — over-escaping makes exported files ugly to read.
  return text
    .replace(/([\\`*_~])/g, "\\$1") // inline mark delimiters + escape char
    .replace(/^(\s*)([#>\-+]|\d+\.)(\s)/gm, "$1\\$2$3"); // leading block markers
}

/** Wrap a text string in the Markdown delimiters for its active marks. */
function applyMarks(text: string, marks: JSONContent["marks"]): string {
  if (!marks || marks.length === 0) return text;
  let out = text;
  // `code` is special: its content is literal (no escaping inside), and it
  // can't be combined with emphasis delimiters meaningfully — handle first.
  const has = (t: string) => marks.some((m) => m.type === t);
  const link = marks.find((m) => m.type === "link");

  if (has("code")) {
    // Inline code: wrap the RAW text (caller passes unescaped for code runs).
    out = "`" + out + "`";
  } else {
    if (has("bold")) out = `**${out}**`;
    if (has("italic")) out = `*${out}*`;
    if (has("strike")) out = `~~${out}~~`;
    // underline + color: intentionally dropped (no clean MD form).
  }
  if (link && typeof link.attrs?.href === "string") {
    out = `[${out}](${link.attrs.href})`;
  }
  return out;
}

/** Render the inline children of a block (text nodes + hardBreak) to Markdown. */
function renderInline(nodes: JSONContent[] | undefined): string {
  if (!nodes) return "";
  let out = "";
  for (const node of nodes) {
    if (node.type === "hardBreak") {
      out += "  \n"; // two trailing spaces = hard line break in Markdown
      continue;
    }
    if (typeof node.text === "string") {
      const isCode = node.marks?.some((m) => m.type === "code");
      // Code spans take raw text (no backslash escaping); everything else escapes.
      const body = isCode ? node.text : escapeText(node.text);
      out += applyMarks(body, node.marks);
    }
  }
  return out;
}

/** Render an ordered/bullet/task list, honoring nesting via indentation. */
function renderList(node: JSONContent, depth: number): string {
  const indent = "  ".repeat(depth);
  const ordered = node.type === "orderedList";
  const startAttr = node.attrs?.start;
  let n = typeof startAttr === "number" ? startAttr : 1;
  const items: string[] = [];

  for (const item of node.content ?? []) {
    const isTask = item.type === "taskItem";
    const checked = item.attrs?.checked === true;
    let marker: string;
    if (isTask) marker = `- [${checked ? "x" : " "}] `;
    else if (ordered) marker = `${n++}. `;
    else marker = "- ";

    // A list item contains block children (usually one paragraph, maybe a
    // nested list). The first paragraph sits on the marker line; nested lists
    // and extra blocks indent under it.
    const childBlocks = item.content ?? [];
    const lines: string[] = [];
    childBlocks.forEach((child, i) => {
      if (child.type === "bulletList" || child.type === "orderedList" || child.type === "taskList") {
        lines.push(renderList(child, depth + 1));
      } else {
        const text = renderInline(child.content);
        if (i === 0) lines.push(indent + marker + text);
        else lines.push(indent + "  " + text); // continuation paragraph
      }
    });
    // Edge case: empty item still needs its marker line.
    if (lines.length === 0) lines.push(indent + marker);
    items.push(lines.join("\n"));
  }
  return items.join("\n");
}

/** Render one block-level node to a Markdown string (no trailing newline). */
function renderBlock(node: JSONContent): string {
  switch (node.type) {
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
      return "#".repeat(level) + " " + renderInline(node.content);
    }
    case "paragraph":
      return renderInline(node.content);
    case "bulletList":
    case "orderedList":
    case "taskList":
      return renderList(node, 0);
    case "blockquote": {
      // Prefix every line of the inner blocks with "> ".
      const inner = (node.content ?? []).map(renderBlock).join("\n\n");
      return inner
        .split("\n")
        .map((l) => (l.length ? `> ${l}` : ">"))
        .join("\n");
    }
    case "codeBlock": {
      const lang = typeof node.attrs?.language === "string" ? node.attrs.language : "";
      const code = (node.content ?? []).map((c) => c.text ?? "").join("");
      return "```" + lang + "\n" + code + "\n```";
    }
    case "horizontalRule":
      return "---";
    default:
      // Unknown block → best-effort flatten of any inline children.
      return renderInline(node.content);
  }
}

/**
 * Serialize a Tiptap document to a Markdown string. Blocks are separated by a
 * blank line (CommonMark paragraph break). Returns "" for an empty/null doc.
 */
export function docToMarkdown(doc: JSONContent | null | undefined): string {
  if (!doc || !Array.isArray(doc.content)) return "";
  const blocks = doc.content.map(renderBlock);
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
