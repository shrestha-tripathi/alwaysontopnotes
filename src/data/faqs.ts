/** FAQ data — shared by FAQ.astro and /llms-full.txt. */
export const faqGroups = [
  {
    title: "Privacy & storage",
    icon: "shield",
    items: [
      {
        q: "Where are my notes actually stored?",
        a: "In your browser's built-in IndexedDB database — entirely on your device. Nothing is sent to our servers. There IS no server. The entire app is static HTML + JavaScript served from a CDN. Open your browser's DevTools → Network tab and try saving a note. You won't see a single network request.",
      },
      {
        q: "Can you read my notes?",
        a: "No. We can't because we don't have them. Notes live in your browser's local storage on your device, never on our infrastructure. The MIT-licensed source on GitHub is auditable line-by-line — you can verify there's no upload code and that nothing reads your note content. The site does run Google Analytics, which records one anonymous pageview when you load the page, and may serve ads; neither can see a single character of what you write.",
      },
      {
        q: "What happens to my notes if I clear my browser data?",
        a: "They're gone. That's the tradeoff for true local storage: your notes live in YOUR browser, and clearing browser data wipes them like it wipes cookies. This is why we ship a one-click \"Export all as markdown\" button — back up before clearing. Switching to a new device? Same answer: export → import. (Real device sync via end-to-end encrypted CRDTs is on the long-term roadmap, but only as an opt-in.)",
      },
      {
        q: "Is it safe to type sensitive information?",
        a: "Safer than typing it into any cloud-based notes app (Apple Notes, Google Keep, Notion, etc.), because those services upload, store, index, and back up your text. We don't. But \"safe\" is relative — anything in your browser is accessible to malware running on your device, the same way it could access your bank app. For passwords specifically, use a dedicated password manager.",
      },
    ],
  },
  {
    title: "Compatibility & setup",
    icon: "globe",
    items: [
      {
        q: "Which browsers does it work in?",
        a: "Full experience (with the floating window): Chrome 116+, Edge 116+, Opera 102+, Brave 1.58+. Read-write but no floating: Safari 17+ (no Document PiP support yet), Firefox (no Document PiP support yet). Mobile browsers can edit notes normally — Document PiP is desktop-only, period.",
      },
      {
        q: "Do I need to install anything?",
        a: "No — it works as a website. But if you want a desktop icon and offline support, click \"Install as app\" in the menu (or your browser's address bar). That makes it a Progressive Web App, available offline, launchable from your Start menu / Dock without opening the browser first.",
      },
      {
        q: "Does it work offline?",
        a: "Yes, once you've loaded it once. The app is cached via a service worker on first visit. Subsequent visits work fully offline — create notes, edit, search, pop out to floating window. Your notes never needed the internet to begin with, since they live locally.",
      },
    ],
  },
  {
    title: "Vs native sticky notes",
    icon: "layers",
    items: [
      {
        q: "How is this different from Windows Sticky Notes?",
        a: "Three structural advantages: (1) Our notes float over Zoom, Teams, full-screen video — Windows Sticky Notes get hidden behind any maximized window. (2) Same notes work on Mac, Linux, and Chromebook — Windows Sticky Notes is Windows-only. (3) Markdown export anytime — Windows Sticky Notes has no export at all, so a Windows reinstall wipes them permanently. Plus rich text, keyboard shortcuts, and open source code you can audit.",
      },
      {
        q: "Can I sync notes between my Mac and PC?",
        a: "Not automatically — we don't upload anything, so there's no \"cloud sync\" to enable. The current workflow is: export as markdown from one device → import on the other. End-to-end encrypted device sync (using CRDTs over a relay you control) is on the long-term roadmap, but only as an opt-in feature. The default will always be local-only.",
      },
    ],
  },
  {
    title: "Features",
    icon: "type",
    items: [
      {
        q: "Can AI agents use it (WebMCP)?",
        a: "Yes — AI agent ready (WebMCP). In browsers that expose navigator.modelContext, the /app page registers three tools: create_note (text), list_notes, and open_floating. They drive the same local notes store you use, so notes still never leave your device. Opening the floating window may still need your click, because browsers require a user gesture for Picture-in-Picture. In other browsers nothing changes.",
      },
      {
        q: "Can I use markdown?",
        a: "Yes — the editor (built on Tiptap) supports markdown shortcuts as you type. Type `# ` for a heading, `- ` for a list, `[ ] ` for a checkbox, `**bold**` for bold, ` ``code`` ` for inline code, and so on. You can also paste markdown and it renders rich, or paste rich text and it's preserved. Export gives you clean markdown back.",
      },
      {
        q: "Can I share notes with someone else?",
        a: "Export the note as a markdown file (`.md`) and share that — same as you'd share any other file. We deliberately don't offer a cloud share link, because creating one would require uploading the note to our server, which breaks the core privacy promise.",
      },
    ],
  },
  {
    title: "Sustainability",
    icon: "code",
    items: [
      {
        q: "Is it really free forever?",
        a: "Yes. Every feature, free — no premium tier, no “upgrade for more features,” no account. The whole app is a static site on Cloudflare Pages, so running costs are essentially zero. We do run Google Analytics for anonymous pageview counts, and the site may show ads to cover the domain bill — but neither one ever touches your notes, which stay in your browser's local storage on your device. Maintained as an indie project by one developer (Shrestha). There's an optional tip jar in the menu if you want to support the work.",
      },
      {
        q: "What if the site goes down or the project is abandoned?",
        a: "Your notes don't depend on us. They're in your browser's local storage, accessible even if alwaysontopnotes.com vanishes tomorrow. The source code is MIT-licensed on GitHub — fork it, self-host it (it's a static site, runs on any web server), or run it from a local file. The export feature also gives you portable markdown files that work with any text editor forever.",
      },
    ],
  },
];

export const allFaqs = faqGroups.flatMap((g) => g.items);
