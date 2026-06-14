// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// site URL is env-driven so the same build pipeline works for:
//   - Cloudflare Pages preview (https://<branch>.alwaysontopnotes.pages.dev)
//   - Production custom domain (https://alwaysontopnotes.com)
// Default = production custom domain; preview deploys can override via env.
const SITE = process.env.PUBLIC_SITE_URL ?? 'https://alwaysontopnotes.com';

/**
 * aotn-sw-precache — rewrites the placeholders in dist/sw.js after the build
 * (Phase 4 · commit 16, Decision B = real offline app-shell). The service
 * worker ships from public/ with `__BUILD_ID__` + `__PRECACHE_PLACEHOLDER__`
 * tokens; here we:
 *   1. glob the built dist/ for the app shell + every hashed _astro/* asset +
 *      icons/manifest/paper-noise, build the precache URL list.
 *   2. derive BUILD_ID from a hash of that list's contents, so the cache name
 *      only rotates when the bundles actually change (not on every deploy) —
 *      avoids needless re-precache churn while still busting the stale-Worker
 *      class (see cloudflare-pages-worker-version-cachebust skill).
 * Runs only at build time; `npm run dev` leaves the placeholders untouched and
 * the SW's allSettled precache no-ops on the dev sentinel.
 */
function swPrecache() {
  return {
    name: 'aotn-sw-precache',
    hooks: {
      'astro:build:done': async (/** @type {{ dir: URL, logger: { info: (m: string) => void, warn: (m: string) => void } }} */ { dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const swPath = path.join(distDir, 'sw.js');

        let sw;
        try {
          sw = await readFile(swPath, 'utf8');
        } catch {
          logger.warn('sw.js not found in dist — skipping precache injection');
          return;
        }

        // App-shell HTML routes we want available offline (network-first, but
        // cached as a fallback). `/offline` is the last-resort nav response.
        const shell = ['/', '/app', '/compare', '/faq', '/offline', '/manifest.webmanifest'];

        // Static public assets that the shell references by raw path.
        const publicAssets = ['/favicon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/assets/paper-noise.svg'];

        // Every hashed bundle Astro/Vite emitted (JS + CSS) — these are the
        // editor island, the lazy Tiptap chunk, etc. Content-hashed + immutable.
        const astroDir = path.join(distDir, '_astro');
        /** @type {string[]} */
        let hashed = [];
        try {
          const files = await readdir(astroDir);
          hashed = files
            .filter((f) => /\.(js|css)$/.test(f))
            .map((f) => `/_astro/${f}`);
        } catch {
          // no _astro dir (unlikely) — shell-only precache still works.
        }

        const urls = [...new Set([...shell, ...publicAssets, ...hashed])].sort();
        const buildId = createHash('sha256')
          .update(urls.join('\n'))
          .digest('hex')
          .slice(0, 12);

        sw = sw
          .replace('"__BUILD_ID__"', JSON.stringify(buildId))
          .replace('["__PRECACHE_PLACEHOLDER__"]', JSON.stringify(urls));

        await writeFile(swPath, sw, 'utf8');
        logger.info(`sw.js precache injected — ${urls.length} urls, build ${buildId}`);
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  integrations: [swPrecache()],
  vite: {
    plugins: [tailwindcss()],
  },
});
