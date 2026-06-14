/**
 * Central site configuration — single source of truth for brand name,
 * domain, and SEO meta. Override via PUBLIC_* env vars.
 *
 * Nothing in /src should hardcode the brand name — always import from here so
 * a domain rename is one `.env` edit away.
 */

const env = import.meta.env;

/**
 * Resolve the canonical site URL. A stale `PUBLIC_SITE_URL` env var (e.g.
 * left over from the pre-domain Cloudflare Pages deploy that pointed at
 * `*.pages.dev`) would corrupt every canonical link, OG tag, and sitemap
 * entry — so we explicitly reject any `.pages.dev` value and fall back to
 * the production domain. Override is still honored for any legit custom URL.
 */
const rawSiteUrl = env.PUBLIC_SITE_URL ?? "https://alwaysontopnotes.com";
const siteUrl = /\.pages\.dev/i.test(rawSiteUrl)
  ? "https://alwaysontopnotes.com"
  : rawSiteUrl;

export const site = {
  name: env.PUBLIC_SITE_NAME ?? "AlwaysOnTopNotes",
  shortName: env.PUBLIC_SITE_SHORT_NAME ?? "AlwaysOnTopNotes",
  domain: /\.pages\.dev/i.test(env.PUBLIC_SITE_DOMAIN ?? "")
    ? "alwaysontopnotes.com"
    : (env.PUBLIC_SITE_DOMAIN ?? "alwaysontopnotes.com"),
  url: siteUrl,
  /**
   * Short memorable tagline shown in hero + OG cards.
   * Positions us as the only browser-native floating sticky-notes.
   */
  tagline:
    env.PUBLIC_SITE_TAGLINE ?? "Sticky notes that float over every app.",
  /**
   * Meta description — under 160 chars so Google doesn't truncate.
   * Front-loads the highest-intent keywords: 'sticky notes', 'always on top',
   * 'floating', 'no install', 'free'.
   */
  description:
    env.PUBLIC_SITE_DESCRIPTION ??
    "Sticky notes that float over every app via Document Picture-in-Picture. Free forever, no install, no signup. Notes stay on your device.",
  /**
   * SEO keywords meta — low ranking weight in 2026 but free signal for
   * Bing, Yandex, DuckDuckGo. Curated for actual user search intent.
   */
  keywords:
    env.PUBLIC_SITE_KEYWORDS ??
    "sticky notes always on top, floating sticky notes, always on top notes, browser sticky notes, sticky notes web app, sticky notes online, floating notepad, popup notes, transparent sticky notes, sticky notes during meetings, sticky notes for windows, sticky notes for mac, sticky notes browser, sticky notes overlay, sticky notes desktop widget",
  author: env.PUBLIC_SITE_AUTHOR ?? "Shrestha Tripathi",
  locale: env.PUBLIC_SITE_LOCALE ?? "en-US",
  /**
   * Public contact email shown on /contact and /privacy-policy.
   */
  contactEmail:
    env.PUBLIC_SITE_CONTACT_EMAIL ?? "shrestha.tripathi@gmail.com",
  /**
   * Public GitHub repo URL — surfaced on /contact, /about, /privacy as the
   * canonical "audit the source" link.
   */
  githubRepo:
    env.PUBLIC_SITE_GITHUB_REPO ??
    "https://github.com/shrestha-tripathi/alwaysontopnotes",
  /**
   * Jurisdiction whose law governs the Terms & Conditions.
   */
  jurisdiction: env.PUBLIC_SITE_JURISDICTION ?? "India",
  /**
   * Google Analytics 4 Measurement ID (format: G-XXXXXXXXXX). Empty string
   * disables the gtag.js snippet entirely. Only injected in production
   * builds so localhost dev never pollutes the analytics property.
   *
   * AOTN has its OWN dedicated GA4 property (G-0BQXBH4REP) — NOT the shared
   * worksoffline family id (G-Q1Y0YHLJ8K) it used to share by mistake.
   */
  gaId: env.PUBLIC_GA_MEASUREMENT_ID ?? "G-0BQXBH4REP",
} as const;

export type SiteConfig = typeof site;
