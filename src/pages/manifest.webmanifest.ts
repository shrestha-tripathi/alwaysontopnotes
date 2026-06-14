/**
 * Web App Manifest — emitted as a build-time endpoint (NOT a static
 * `public/manifest.webmanifest`) so the brand name/description flow from
 * `site.config.ts`. A rebrand stays a one-`.env` edit, matching the project's
 * "never hardcode the brand" rule (a file in public/ couldn't read the config).
 *
 * Output: dist/manifest.webmanifest, referenced by <link rel="manifest"> in
 * Layout.astro. `_headers` also pins the application/manifest+json MIME at the
 * edge; we set it here too so `astro preview` serves the right type locally.
 */
import type { APIRoute } from "astro";
import { site } from "../site.config";

export const prerender = true;

export const GET: APIRoute = () => {
  const manifest = {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    // Launch straight into the notes app, not the marketing home.
    start_url: "/app",
    // Scope is the whole origin so in-app navigations (faq/compare/offline)
    // stay "in app" rather than kicking out to a browser tab.
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "portrait-primary",
    // background_color matches the dark first-paint body so the launch splash
    // doesn't flash a mismatched colour; theme_color is the brand yellow.
    background_color: "#0a0a0a",
    theme_color: "#fde047",
    lang: site.locale.split("-")[0],
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
