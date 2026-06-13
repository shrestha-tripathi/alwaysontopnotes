import type { APIRoute } from "astro";
import { site } from "../site.config";

const pages = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/app", priority: 0.9, changefreq: "monthly" },
  { path: "/how-it-works", priority: 0.8, changefreq: "monthly" },
  { path: "/compare", priority: 0.8, changefreq: "monthly" },
  { path: "/faq", priority: 0.7, changefreq: "monthly" },
  { path: "/install", priority: 0.6, changefreq: "monthly" },
  { path: "/about", priority: 0.5, changefreq: "yearly" },
  { path: "/contact", priority: 0.5, changefreq: "yearly" },
  { path: "/privacy-policy", priority: 0.3, changefreq: "yearly" },
  { path: "/terms", priority: 0.3, changefreq: "yearly" },
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
