import { site, absoluteUrl, lastUpdatedLabel } from "../site.config";
import { pseo } from "../data/pseo";

/** llms.txt (llmstxt.org) — generated at build so brand/domain come from site.config. */
export const pages: { path: string; desc: string }[] = [
  { path: "/", desc: "Home — floating always-on-top sticky notes in the browser." },
  { path: "/app", desc: "The notes app itself (create, edit, search, pop out to a floating window)." },
  { path: "/how-it-works", desc: "How Document Picture-in-Picture keeps notes above other apps." },
  { path: "/compare", desc: "Comparison with Windows Sticky Notes, macOS Stickies and cloud notes apps." },
  { path: "/faq", desc: "FAQ: storage, privacy, browsers, offline use, export." },
  { path: "/install", desc: "Installing as a PWA for offline use and a desktop icon." },
  { path: "/about", desc: "About the project." },
  { path: "/privacy-policy", desc: "Privacy policy." },
  { path: "/guides", desc: "Index of how-to guides (per OS and per app: Zoom, Teams, Meet, YouTube, gaming, meetings)." },
  ...pseo.map((e) => ({ path: `/guides/${e.slug}`, desc: e.metaDescription })),
];

export function llmsHeader(): string {
  return `# ${site.name}

> ${site.description}

## What it is
A free, open-source (MIT) sticky-notes web app. Rich-text notes with markdown shortcuts, 8 colours, pinning, search and markdown export/import. A note can pop out into a real OS-level floating window using the Document Picture-in-Picture API, which stays on top of other apps including full-screen Zoom, Teams, Meet and video.

## Privacy
Notes are stored in the browser's IndexedDB on the user's device. No account, no note upload, no server-side storage. The website itself uses Google Analytics for anonymous pageviews and may show ads; neither sees note content.

## Limits
- The floating always-on-top window needs Document Picture-in-Picture: desktop Chrome or Edge 116+ (and other Chromium browsers). Safari, Firefox and mobile browsers can edit notes but cannot float them.
- No cloud sync: move notes between devices via markdown export/import. Clearing browser data deletes notes.
- Works offline after the first visit (service worker); installable as a PWA.
- Free, no signup. Last updated ${lastUpdatedLabel}.
`;
}

export function pageList(extra: { path: string; desc: string }[] = []): string {
  return [...pages, ...extra].map((p) => `- [${p.path}](${absoluteUrl(p.path)}): ${p.desc}`).join("\n");
}
