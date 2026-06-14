/**
 * Tiptap editor factory — Phase 2 commit 8.
 *
 * VANILLA Tiptap v3 (NO React — this is an Astro MPA island). Builds the rich
 * editor used in /app: the StarterKit basics + checkboxes + links + text color
 * + smart typography, with a floating BubbleMenu toolbar on text selection.
 *
 * Pinned to @tiptap/*@3.26.1 (exact). Do NOT use `@latest` — Tiptap ships
 * breaking changes on minors.
 *
 * ── v3 gotchas baked in here ─────────────────────────────────────────────
 *  - StarterKit v3 ALREADY bundles Link (+ Underline, CodeBlock, history as
 *    `UndoRedo`). So Link is configured THROUGH StarterKit — adding the
 *    standalone @tiptap/extension-link too would throw "duplicate extension".
 *  - BubbleMenu v3 is an EXTENSION (added to `extensions`), configured with a
 *    DOM `element` + `shouldShow`. It uses @floating-ui/dom internally (no more
 *    tippy.js). We pass our own toolbar element so styling stays in Tailwind.
 *  - Color lives in @tiptap/extension-color and REQUIRES TextStyle to be
 *    present (it's a TextStyle-backed mark). Order: TextStyle before Color.
 */
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Typography } from "@tiptap/extension-typography";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { BubbleMenu } from "@tiptap/extension-bubble-menu";
import type { JSONContent } from "./types";

export interface MakeEditorOptions {
  /** The element the editor mounts into (.ProseMirror lives here). */
  element: HTMLElement;
  /** Initial document (Tiptap JSON). */
  content: JSONContent;
  /** The floating-toolbar DOM element (shown on selection). */
  bubbleElement: HTMLElement;
  /** Fired (debounced by caller) whenever the doc changes. */
  onUpdate: (doc: JSONContent) => void;
}

export function makeEditor(opts: MakeEditorOptions): Editor {
  return new Editor({
    element: opts.element,
    content: opts.content as Record<string, unknown>,
    extensions: [
      StarterKit.configure({
        // Link is bundled in StarterKit v3 — configure it here, don't re-add.
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle, // must precede Color (Color is a TextStyle-backed mark)
      Color,
      Typography, // smart quotes / dashes / arrows — one-line quality boost
      Placeholder.configure({ placeholder: "Write something…" }),
      BubbleMenu.configure({
        pluginKey: "aotnBubble",
        element: opts.bubbleElement,
        updateDelay: 120,
        // Only show when there's a non-empty text selection (not on click/caret).
        shouldShow: ({ editor, state }) => {
          const { empty, from, to } = state.selection;
          if (empty || from === to) return false;
          // Don't show inside code blocks (formatting marks don't apply there).
          if (editor.isActive("codeBlock")) return false;
          return editor.isEditable;
        },
      }),
    ],
    editorProps: {
      attributes: {
        // Tailwind hooks; `.aotn-prose` carries our editor typography CSS.
        class: "aotn-prose focus:outline-none",
        "aria-label": "Note editor",
      },
    },
    onUpdate: ({ editor }) => {
      opts.onUpdate(editor.getJSON() as JSONContent);
    },
  });
}
