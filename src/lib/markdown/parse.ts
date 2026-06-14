/**
 * Markdown → Tiptap doc (the inverse of serialize.ts).
 *
 * Line-based parser for our FROZEN editor subset. Hand-rolled (SPEC-Phase4
 * Decision A) for a perfect round-trip with docToMarkdown(). Anything it doesn't
 * recognize degrades to paragraph text — a weird `.md` file must still import as
 * a readable note, never throw.
 *
 * Recognizes:
 *   headings   # … ######
 *   bullets    -  *  +
 *   ordered    1.  2.  …
 *   tasks      - [ ]   - [x]
 *   quote      > …
 *   code       ``` fenced (optional language)
 *   rule       ---  ***  ___
 *   inline     bold, italic, strike, inline code, and [text](href) links
 */
import type { JSONContent } from "../types";

/** Parse inline Markdown in a single text run into Tiptap text nodes. */
function parseInline(text: string): JSONContent[] {
  const nodes: JSONContent[] = [];
  let i = 0;
  let buf = "";

  const flush = (marks?: JSONContent["marks"]) => {
    if (!buf) return;
    const node: JSONContent = { type: "text", text: buf };
    if (marks && marks.length) node.marks = marks;
    nodes.push(node);
    buf = "";
  };

  // Ordered by delimiter length so `**` wins over `*`, `~~` over `~`.
  const inlineRules: { open: string; close: string; mark: string }[] = [
    { open: "**", close: "**", mark: "bold" },
    { open: "__", close: "__", mark: "bold" },
    { open: "~~", close: "~~", mark: "strike" },
    { open: "*", close: "*", mark: "italic" },
    { open: "_", close: "_", mark: "italic" },
  ];

  while (i < text.length) {
    const ch = text[i];

    // Backslash escape — next char is literal.
    if (ch === "\\" && i + 1 < text.length) {
      buf += text[i + 1];
      i += 2;
      continue;
    }

    // Inline code span: `…` (literal content, no nested marks).
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        flush();
        nodes.push({ type: "text", text: text.slice(i + 1, end), marks: [{ type: "code" }] });
        i = end + 1;
        continue;
      }
    }

    // Link: [text](href)
    if (ch === "[") {
      const close = text.indexOf("]", i);
      if (close !== -1 && text[close + 1] === "(") {
        const hrefEnd = text.indexOf(")", close + 2);
        if (hrefEnd !== -1) {
          flush();
          const label = text.slice(i + 1, close);
          const href = text.slice(close + 2, hrefEnd);
          // Recurse so a link label can carry emphasis, then stamp link on each.
          for (const inner of parseInline(label)) {
            const marks = [...(inner.marks ?? []), { type: "link", attrs: { href } }];
            nodes.push({ ...inner, marks });
          }
          i = hrefEnd + 1;
          continue;
        }
      }
    }

    // Emphasis / strike delimiters.
    let matched = false;
    for (const rule of inlineRules) {
      if (text.startsWith(rule.open, i)) {
        const closeAt = text.indexOf(rule.close, i + rule.open.length);
        if (closeAt !== -1) {
          flush();
          const innerText = text.slice(i + rule.open.length, closeAt);
          for (const inner of parseInline(innerText)) {
            const marks = [...(inner.marks ?? []), { type: rule.mark }];
            nodes.push({ ...inner, marks });
          }
          i = closeAt + rule.close.length;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    buf += ch;
    i += 1;
  }
  flush();
  return nodes;
}

/** Build a paragraph node from a line of inline Markdown. */
function paragraph(text: string): JSONContent {
  const content = parseInline(text);
  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const TASK_RE = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/;
const BULLET_RE = /^(\s*)[-*+]\s+(.*)$/;
const ORDERED_RE = /^(\s*)(\d+)\.\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const RULE_RE = /^(?:---+|\*\*\*+|___+)\s*$/;
const FENCE_RE = /^```(.*)$/;

/**
 * Parse a Markdown string into a Tiptap document. Greedy block grouping:
 * consecutive list items of the same kind merge into one list; fenced code
 * spans multiple lines; blockquote lines group; blank lines break paragraphs.
 */
export function markdownToDoc(md: string): JSONContent {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: JSONContent[] = [];
  let i = 0;

  // A "list kind" key so we only merge same-type adjacent items.
  const listKind = (l: string): "bullet" | "ordered" | "task" | null => {
    if (TASK_RE.test(l)) return "task";
    if (ORDERED_RE.test(l)) return "ordered";
    if (BULLET_RE.test(l)) return "bullet";
    return null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Blank line → skip (paragraph breaks handled by block boundaries).
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Fenced code block.
    const fence = line.match(FENCE_RE);
    if (fence) {
      const lang = fence[1].trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE_RE.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // consume closing fence
      const node: JSONContent = {
        type: "codeBlock",
        content: code.length ? [{ type: "text", text: code.join("\n") }] : undefined,
      };
      if (lang) node.attrs = { language: lang };
      blocks.push(node);
      continue;
    }

    // Horizontal rule.
    if (RULE_RE.test(line)) {
      blocks.push({ type: "horizontalRule" });
      i += 1;
      continue;
    }

    // Heading.
    const h = line.match(HEADING_RE);
    if (h) {
      blocks.push({
        type: "heading",
        attrs: { level: h[1].length },
        content: parseInline(h[2]),
      });
      i += 1;
      continue;
    }

    // Blockquote (group consecutive `>` lines).
    if (QUOTE_RE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        inner.push(lines[i].match(QUOTE_RE)![1]);
        i += 1;
      }
      blocks.push({ type: "blockquote", content: [paragraph(inner.join("\n"))] });
      continue;
    }

    // Lists (group consecutive same-kind items).
    const kind = listKind(line);
    if (kind) {
      const items: JSONContent[] = [];
      let start: number | undefined;
      while (i < lines.length && listKind(lines[i]) === kind) {
        const l = lines[i];
        if (kind === "task") {
          const m = l.match(TASK_RE)!;
          items.push({
            type: "taskItem",
            attrs: { checked: m[2].toLowerCase() === "x" },
            content: [paragraph(m[3])],
          });
        } else if (kind === "ordered") {
          const m = l.match(ORDERED_RE)!;
          if (start === undefined) start = Number(m[2]);
          items.push({ type: "listItem", content: [paragraph(m[3])] });
        } else {
          const m = l.match(BULLET_RE)!;
          items.push({ type: "listItem", content: [paragraph(m[2])] });
        }
        i += 1;
      }
      const listType = kind === "task" ? "taskList" : kind === "ordered" ? "orderedList" : "bulletList";
      const node: JSONContent = { type: listType, content: items };
      if (kind === "ordered" && start !== undefined && start !== 1) node.attrs = { start };
      blocks.push(node);
      continue;
    }

    // Default: a paragraph. Greedily merge wrapped lines until a blank line or
    // a line that starts a new block (heading/list/quote/fence/rule).
    const para: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const l = lines[i];
      if (
        l.trim() === "" ||
        HEADING_RE.test(l) ||
        listKind(l) ||
        QUOTE_RE.test(l) ||
        FENCE_RE.test(l) ||
        RULE_RE.test(l)
      ) {
        break;
      }
      para.push(l);
      i += 1;
    }
    // Honor hard breaks: a line ending with two spaces → hardBreak node.
    blocks.push(paragraphWithBreaks(para));
  }

  if (blocks.length === 0) blocks.push({ type: "paragraph" });
  return { type: "doc", content: blocks };
}

/** Build a paragraph from possibly-multiple source lines, mapping `  \n` → hardBreak. */
function paragraphWithBreaks(lines: string[]): JSONContent {
  const content: JSONContent[] = [];
  lines.forEach((line, idx) => {
    const hadHardBreak = /\s{2,}$/.test(line);
    const inline = parseInline(line.replace(/\s+$/, ""));
    content.push(...inline);
    if (idx < lines.length - 1) {
      // Soft-wrapped lines join with a space unless an explicit hard break.
      if (hadHardBreak) content.push({ type: "hardBreak" });
      else content.push({ type: "text", text: " " });
    }
  });
  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
}
