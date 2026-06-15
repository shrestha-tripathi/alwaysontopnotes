/**
 * Sticky-note color tokens. Source of truth: DESIGN.md §2 / UX-CHARTER §3.
 *
 * Each color maps to the literal swatch hex (what the sticky card is painted)
 * plus an `ink` color for legible body text on that swatch. All eight swatches
 * are light pastels, so ink is always a near-black — but we keep it explicit
 * per-color so a future dark swatch (e.g. a "black" note) only needs one edit.
 *
 * Swatches are intentionally LITERAL hex, not theme CSS-vars: a sticky note is
 * the same cheerful yellow in light AND dark mode (that's the whole metaphor —
 * a yellow Post-it doesn't turn dark just because the room is dark). The app
 * chrome around them still uses the themed `--color-*` vars.
 */
import type { StickyColor } from "./types";

export interface Swatch {
  /** Display label (also the hover tooltip — doubles as a soft taxonomy). */
  label: string;
  /** The note background fill. */
  bg: string;
  /** A slightly darker top "tape" strip + border, for the paper edge. */
  edge: string;
  /** Legible text color on this swatch. */
  ink: string;
}

export const SWATCHES: Record<StickyColor, Swatch> = {
  yellow: { label: "Yellow · inbox", bg: "#fde047", edge: "#eab308", ink: "#1c1917" },
  pink: { label: "Pink · personal", bg: "#fbcfe8", edge: "#f0a8d4", ink: "#1c1917" },
  blue: { label: "Blue · work", bg: "#bae6fd", edge: "#7cc7f2", ink: "#1c1917" },
  green: { label: "Green · done", bg: "#bbf7d0", edge: "#86e0a8", ink: "#1c1917" },
  orange: { label: "Orange · urgent", bg: "#fed7aa", edge: "#f8b878", ink: "#1c1917" },
  purple: { label: "Purple · idea", bg: "#e9d5ff", edge: "#cba8f0", ink: "#1c1917" },
  gray: { label: "Gray · reference", bg: "#e5e7eb", edge: "#c8ccd2", ink: "#1c1917" },
  cream: { label: "Cream · important", bg: "#fef9c3", edge: "#f3e89a", ink: "#1c1917" },
};

/** Ordered list for rendering the picker left→right (commit 9). */
export const COLOR_ORDER: StickyColor[] = [
  "yellow",
  "pink",
  "blue",
  "green",
  "orange",
  "purple",
  "gray",
  "cream",
];

export function swatchOf(color: StickyColor): Swatch {
  return SWATCHES[color] ?? SWATCHES.yellow;
}

/**
 * Glow colours for the selected-card box-shadow, derived from a swatch's
 * saturated `edge` hex. Returned as ready-made `rgba()` strings with the alpha
 * baked in — we deliberately AVOID CSS `color-mix(... var(--glow) ...)` because
 * the production CSS minifier (lightningcss) mis-collapses it to a bare
 * `var(--glow)`, dropping the transparency and turning the soft halo into a
 * harsh solid block. Baking alpha here sidesteps that entirely.
 *
 *   --glow        solid edge hex   → the 2px colour ring
 *   --glow-soft   ~0.55 alpha      → the main halo (light theme)
 *   --glow-haze   ~0.40 alpha      → the tinted drop/lift
 *   --glow-strong ~0.80 alpha      → a punchier halo for dark theme (glows read
 *                                    fainter on the near-black board)
 */
export function glowVars(edgeHex: string): {
  glow: string;
  soft: string;
  haze: string;
  strong: string;
} {
  const m = /^#?([0-9a-f]{6})$/i.exec(edgeHex.trim());
  // Fallback to the yellow edge if somehow malformed (keeps the glow on-brand).
  const hex = m ? m[1] : "eab308";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const rgba = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
  return {
    glow: `#${hex}`,
    soft: rgba(0.85),
    haze: rgba(0.6),
    strong: rgba(0.95),
  };
}

/**
 * Deterministic micro-rotation (-2°…+2°) hashed from a note id, so each sidebar
 * card tilts like a real pinned sticky note but stays stable across renders
 * (DESIGN.md §13 / UX-CHARTER §3). Pure function of the id → no layout jitter.
 */
export function rotationFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  // Map hash into [-2, 2] degrees.
  return ((Math.abs(h) % 41) - 20) / 10;
}
