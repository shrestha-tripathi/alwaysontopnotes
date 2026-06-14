/**
 * welcome.ts — the first-run sample note (UX-CHARTER §"Empty states never look
 * empty"). Owns the welcome COPY + the seed doc + the one-time guard, so the
 * store stays free of product strings.
 *
 * Why a real seeded note (not a hardcoded empty-state panel): the charter wants
 * new users to land on actual content they can edit/delete — it teaches the
 * product by being the product. The note is a normal Note in every way (rich
 * doc, color, autosave, deletable, syncs across tabs); the only special thing is
 * it's created once, gated by a localStorage flag so it never re-appears after
 * the user dismisses/deletes it.
 *
 * COPY SCOPE (deliberate divergence from UX-CHARTER's example text): the charter
 * draft references "Cmd+K command palette" (Phase 4) and "Pop out / PiP"
 * (Phase 3) — neither ships in Phase 2. Advertising dead shortcuts is worse than
 * a plain note, so this copy only mentions what ACTUALLY works today (N, /, ?,
 * J/K, auto-save, privacy). Restore the fuller pitch when those phases land.
 */
import type { JSONContent, StickyColor } from "./types";

const WELCOMED_FLAG = "aotn:welcomed-v1";

/** Has the first-run welcome note already been seeded (or dismissed)? */
export function hasWelcomed(): boolean {
  try {
    return localStorage.getItem(WELCOMED_FLAG) === "1";
  } catch {
    // Private mode / storage disabled → treat as "already welcomed" so we don't
    // re-seed on every load. The app still works; the user just skips the note.
    return true;
  }
}

/** Mark the welcome note as seeded so it never re-appears. */
export function markWelcomed(): void {
  try {
    localStorage.setItem(WELCOMED_FLAG, "1");
  } catch {
    // No-op: nothing we can do if storage is unavailable.
  }
}

/** The color of the welcome note — soft cream ("important"), the default. */
export const WELCOME_COLOR: StickyColor = "cream";

/**
 * The welcome note's rich Tiptap document. A heading, a one-line intro, a
 * bulleted list of working shortcuts (bold key + plain description), and a
 * reassuring privacy/auto-save line. Shape matches `editor.getJSON()` exactly,
 * so it loads into Tiptap with zero migration.
 */
export function welcomeDoc(): JSONContent {
  const shortcut = (key: string, desc: string): JSONContent => ({
    type: "listItem",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", marks: [{ type: "bold" }], text: key },
          { type: "text", text: ` — ${desc}` },
        ],
      },
    ],
  });

  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Welcome to AlwaysOnTopNotes 👋" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "A floating sticky-notes app that lives in your browser. Try these:" },
        ],
      },
      {
        type: "bulletList",
        content: [
          shortcut("N", "create a new note"),
          shortcut("/", "jump to search"),
          shortcut("J / K", "move down / up the list"),
          shortcut("?", "see every keyboard shortcut"),
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Notes auto-save as you type, and nothing ever leaves your device. " },
          { type: "text", marks: [{ type: "italic" }], text: "Delete this note whenever you're ready." },
        ],
      },
    ],
  };
}
