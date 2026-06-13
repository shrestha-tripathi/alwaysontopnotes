// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// site URL is env-driven so the same build pipeline works for:
//   - Cloudflare Pages preview (https://<branch>.alwaysontopnotes.pages.dev)
//   - Production custom domain (https://alwaysontopnotes.com)
// Default = production custom domain; preview deploys can override via env.
const SITE = process.env.PUBLIC_SITE_URL ?? 'https://alwaysontopnotes.com';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  vite: {
    plugins: [tailwindcss()],
  },
});
