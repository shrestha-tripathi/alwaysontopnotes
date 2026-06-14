/**
 * gen-og-image.mjs — generate public/og-image.png (1200×630) for the social
 * share card (Open Graph + Twitter summary_large_image).
 *
 * Phase 4 · commit 18. The Layout has referenced /og-image.png since the SEO
 * meta landed, but the asset never existed → every share unfurl showed a broken
 * image. This generates it from an inline SVG (no external font needed — uses
 * Liberation Sans, the system Arial-metric face, which librsvg renders crisply).
 *
 * Aesthetic: matches the family OG look + the AOTN brand — a dark #0a0a0a card
 * (the app's first-paint background) with the cream/yellow sticky-note metaphor
 * floating on the right, the hook tagline + brand + domain on the left.
 *
 * Run FROM the project dir (sharp resolves its native binary from the project
 * node_modules — a /tmp script gets ERR_MODULE_NOT_FOUND):
 *   node scripts/gen-og-image.mjs
 *
 * Brand strings are read from src/site.config.ts defaults so a rebrand keeps
 * this honest; we parse the literal defaults (the file is TS, not importable
 * here without a build step, so we read the fallback string values).
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// --- Pull brand strings from site.config.ts defaults (single source of truth) ---
const cfg = readFileSync(join(projectRoot, "src/site.config.ts"), "utf8");
const grab = (key, fallback) => {
  // matches:  key:\n? env.PUBLIC_X ?? "value"   OR   key: env.PUBLIC_X ?? "value"
  const re = new RegExp(`${key}:\\s*[^?]*\\?\\?\\s*\\n?\\s*"([^"]+)"`);
  const m = cfg.match(re);
  return m ? m[1] : fallback;
};
const NAME = grab("name", "AlwaysOnTopNotes");
const DOMAIN = grab("domain", "alwaysontopnotes.com");
// NOTE: the hero headline is a hand-designed two-line treatment with a colored
// accent on "every app." — it mirrors site.tagline by intent but is laid out
// per-line here, so it's not a drop-in string slot. NAME + DOMAIN ARE
// config-driven (they appear verbatim), keeping the rebrand-sensitive parts
// honest; if the tagline ever changes, update the two hook <text> lines below.

const W = 1200;
const H = 630;

// XML-escape any dynamic string that lands in SVG text.
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A single sticky note: rounded body + darker "pinned" header strip + soft
// shadow, tilted. (cx,cy) is the centre; rot in degrees.
const sticky = (cx, cy, w, h, fill, strip, rot) => {
  const x = cx - w / 2;
  const y = cy - h / 2;
  return `
    <g transform="rotate(${rot} ${cx} ${cy})" filter="url(#noteShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}"/>
      <rect x="${x}" y="${y}" width="${w}" height="${Math.round(h * 0.16)}" rx="14" fill="${strip}"/>
      <rect x="${x}" y="${y + Math.round(h * 0.10)}" width="${w}" height="${Math.round(h * 0.06)}" fill="${strip}"/>
      <rect x="${x + 22}" y="${y + Math.round(h * 0.33)}" width="${w - 44}" height="10" rx="5" fill="#1c1917" opacity="0.30"/>
      <rect x="${x + 22}" y="${y + Math.round(h * 0.33) + 30}" width="${w - 90}" height="10" rx="5" fill="#1c1917" opacity="0.22"/>
      <rect x="${x + 22}" y="${y + Math.round(h * 0.33) + 60}" width="${w - 60}" height="10" rx="5" fill="#1c1917" opacity="0.16"/>
    </g>`;
};

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="78%" cy="22%" r="60%">
      <stop offset="0%" stop-color="#facc15" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="#facc15" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#facc15" stop-opacity="0"/>
    </radialGradient>
    <filter id="noteShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="16" stdDeviation="26" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
    <linearGradient id="hair" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#facc15" stop-opacity="0"/>
      <stop offset="12%" stop-color="#facc15" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#facc15" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#0a0a0a"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Floating sticky-note stack (right side) — the product metaphor -->
  ${sticky(1000, 388, 232, 250, "#fbcfe8", "#f9a8d4", 9)}
  ${sticky(935, 322, 232, 250, "#fde68a", "#facc15", -6)}
  ${sticky(1018, 276, 232, 250, "#fef9c3", "#fde047", 4)}

  <!-- Left column text -->
  <!-- eyebrow -->
  <text x="84" y="150" font-family="Liberation Sans, DejaVu Sans, sans-serif" font-size="25" font-weight="bold" letter-spacing="3" fill="#facc15">FREE · NO INSTALL · NO SIGNUP</text>

  <!-- hook tagline (two lines, the hero) -->
  <text x="80" y="268" font-family="Liberation Sans, DejaVu Sans, sans-serif" font-size="60" font-weight="bold" fill="#fafafa">Sticky notes that</text>
  <text x="80" y="344" font-family="Liberation Sans, DejaVu Sans, sans-serif" font-size="60" font-weight="bold" fill="#fafafa">float over <tspan fill="#facc15">every app.</tspan></text>

  <!-- supporting line -->
  <text x="84" y="424" font-family="Liberation Sans, DejaVu Sans, sans-serif" font-size="27" fill="#a3a3a3">Always-on-top notes, right in your</text>
  <text x="84" y="461" font-family="Liberation Sans, DejaVu Sans, sans-serif" font-size="27" fill="#a3a3a3">browser. Nothing leaves your device.</text>

  <!-- hairline -->
  <rect x="84" y="514" width="430" height="3" fill="url(#hair)"/>

  <!-- brand + domain -->
  <text x="84" y="566" font-family="Liberation Sans, DejaVu Sans, sans-serif" font-size="33" font-weight="bold" fill="#fafafa">${esc(NAME)}</text>
  <text x="${W - 84}" y="566" text-anchor="end" font-family="Liberation Sans, DejaVu Sans, sans-serif" font-size="27" fill="#facc15">${esc(DOMAIN)}</text>
</svg>`;

const out = join(projectRoot, "public", "og-image.png");
await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9, effort: 10 })
  .toFile(out);

const { size } = await import("node:fs").then((fs) => fs.promises.stat(out));
console.log(
  `✓ og-image.png written (${(size / 1024).toFixed(1)} KB) — ${NAME} / ${DOMAIN}`,
);
