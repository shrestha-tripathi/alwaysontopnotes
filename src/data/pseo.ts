/**
 * Programmatic SEO guides — rendered by src/pages/guides/[slug].astro.
 * Every claim must match the real app: rich-text notes with markdown
 * shortcuts, 8 colours, pinning, search, markdown export/import, IndexedDB
 * storage on-device, PWA/offline, and a floating always-on-top window via
 * Document Picture-in-Picture (desktop Chrome/Edge 116+ only; opened with the
 * pop-out button in the /app toolbar). No sync, no sharing links, no upload.
 */
import { part1 } from "./pseo-1";
import { part2 } from "./pseo-2";

export interface PseoFaq { q: string; a: string }
export interface PseoEntry {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  intro: string;
  steps: string[];
  tips: string[];
  faqs: PseoFaq[];
  related: string[];
  /** Show the "follow the rules of your exam / interview" ethics note. */
  ethicsNote?: boolean;
}

export const pseo: PseoEntry[] = [...part1, ...part2];
export const pseoBySlug = new Map(pseo.map((e) => [e.slug, e]));
