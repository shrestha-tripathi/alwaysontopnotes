import type { APIRoute } from "astro";
import { site } from "../site.config";

/**
 * Sitemap — ONLY real, indexable, public pages belong here.
 *
 * Deliberately EXCLUDED:
 * - `/app` — the notes app itself is `noindex` (it's the tool, not content).
 *   Listing a noindexed URL in the sitemap is a Search-Console warning
 *   ("Submitted URL marked noindex"), so it's dropped.
 * - `/offline`, `/404` — noindex utility pages, never indexable.
 * - `/how-it-works`, `/install`, `/about`, `/contact`, `/privacy-policy`,
 *   `/terms` — these routes do NOT exist yet (they'd 404). A sitemap must
 *   never list URLs that 404. Re-add each here the SAME commit its page ships.
 *
 * Keep this list in lockstep with the actual indexable pages in src/pages/.
 */
const pages = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/compare", priority: 0.8, changefreq: "monthly" },
  { path: "/faq", priority: 0.7, changefreq: "monthly" },
];

const today = new Date().toISOString().split("T")[0];

export const GET: APIRoute = () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${site.url}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
