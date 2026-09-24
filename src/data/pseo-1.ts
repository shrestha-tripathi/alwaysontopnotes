import type { PseoEntry } from "./pseo";

export const part1: PseoEntry[] = [
  {
    slug: "always-on-top-notes-windows",
    title: "Always-on-Top Sticky Notes on Windows 10 & 11 — Free, No Install",
    h1: "Always-on-top sticky notes on Windows",
    metaDescription:
      "Keep a sticky note above every window on Windows 10/11 without installing anything. Uses Chrome or Edge's floating window; notes stay on your PC.",
    intro:
      "The built-in Windows Sticky Notes app has no \"always on top\" option, so a note disappears the moment you maximise another window. Chrome and Edge (version 116+) on Windows support Document Picture-in-Picture: a small, real OS window that stays above other apps. Open a note here, press the pop-out button, and it floats over Explorer, Excel, your IDE or a full-screen video.",
    steps: [
      "Open the app in Chrome or Edge on Windows (version 116 or newer).",
      "Press N (or the New note button) and type — rich text and markdown shortcuts like \"- \" and \"[ ] \" work.",
      "Click the pop-out button in the note toolbar. A floating window opens and stays above other windows.",
      "Drag and resize it like any window; the size is remembered per note for next time.",
      "Optional: install it as an app from Edge/Chrome's address bar so it gets a Start-menu icon and works offline.",
    ],
    tips: [
      "Snap layouts don't apply to the floating window — just drag it to a corner so it doesn't cover your taskbar.",
      "Keep one pinned note for recurring info (a ticket number, a checklist) so it's always first in the sidebar.",
      "Export all notes as markdown before resetting Windows or clearing browser data — notes live in the browser profile, not in the cloud.",
    ],
    faqs: [
      { q: "Does this replace Windows Sticky Notes?", a: "For always-on-top use, yes: Windows Sticky Notes can't float over maximised apps. It doesn't sync through a Microsoft account though; notes stay in this browser on this PC." },
      { q: "Does it work in Firefox on Windows?", a: "You can write and edit notes in Firefox, but the floating window needs Document Picture-in-Picture, which Firefox doesn't support at the time of writing. Use Chrome or Edge for the always-on-top part." },
      { q: "Can I have several floating notes at once?", a: "The browser allows one Document Picture-in-Picture window per tab. Inside it you can switch between notes with the arrows, so one floating window can cycle through all of them." },
    ],
    related: ["always-on-top-notes-mac", "sticky-notes-over-teams", "notes-while-gaming"],
  },
  {
    slug: "always-on-top-notes-mac",
    title: "Always-on-Top Notes on Mac — Floating Sticky Notes Without an App",
    h1: "Always-on-top notes on a Mac",
    metaDescription:
      "Stickies can float, but not over full-screen apps. Get a floating note that stays visible over Zoom and full-screen Spaces on macOS, free in Chrome or Edge.",
    intro:
      "macOS Stickies has a \"Float on Top\" option, but it doesn't follow you into full-screen Spaces and its notes stay on one Mac. With Chrome or Edge 116+ on macOS, this app opens a note in a Document Picture-in-Picture window that floats above other apps. Safari can edit notes but doesn't support the floating window yet.",
    steps: [
      "Open the app in Chrome or Edge on your Mac.",
      "Create a note (N) and write — ⌘B, ⌘I and ⌘K for bold, italic and links.",
      "Click the pop-out button in the toolbar to float the note.",
      "Position it over the app you're working in; it stays on top when you switch apps.",
      "Use Export to save notes as .md files you can open in any Mac text editor.",
    ],
    tips: [
      "If you use full-screen apps, try opening the floating note before entering full screen and check it stays visible on your setup.",
      "Install as an app from Chrome's menu to launch it from the Dock or Spotlight like a native app.",
      "Moving from Stickies? Paste the text in — markdown-style lists and checkboxes are converted as you type.",
    ],
    faqs: [
      { q: "Why doesn't the floating window work in Safari?", a: "Safari doesn't implement Document Picture-in-Picture at the time of writing. Notes still work normally in Safari; only the pop-out is hidden." },
      { q: "Do notes sync to my iPhone via iCloud?", a: "No. Nothing is uploaded, so there's no iCloud sync. Notes stay in the browser on this Mac; move them with markdown export and import." },
      { q: "Is the floating note visible when I share my screen?", a: "If you share your entire screen, other people can generally see any window on it, including the floating note. Sharing a single window or tab usually excludes it — check your meeting app's preview." },
    ],
    related: ["always-on-top-notes-windows", "sticky-notes-over-zoom", "sticky-notes-chromebook"],
  },
  {
    slug: "sticky-notes-chromebook",
    title: "Sticky Notes on Chromebook — Floating, Offline, Free",
    h1: "Sticky notes on a Chromebook that float over other windows",
    metaDescription:
      "ChromeOS has no built-in sticky notes. Use a free web app with a floating always-on-top window that works offline and keeps notes on your Chromebook.",
    intro:
      "ChromeOS doesn't ship a sticky-notes app, and many Android note apps don't float over browser windows. Because Chrome on ChromeOS is a desktop Chrome, it supports Document Picture-in-Picture, so this app can pop a note out into a small window that stays on top of your tabs and apps. Install it as an app and it works offline.",
    steps: [
      "Open the app in Chrome on your Chromebook.",
      "Click the install icon in the address bar (or Chrome menu → Install) to add it to your launcher.",
      "Create a note and type your list, reminders or reference info.",
      "Press the pop-out button to float it over other windows.",
      "Pin important notes so they stay at the top of the list.",
    ],
    tips: [
      "School-managed Chromebooks may block app installs or certain APIs — the notes still work in a normal tab.",
      "Clearing browsing data or powerwashing wipes notes; export them as markdown to Google Drive or a USB stick first if you want a backup.",
      "Use colours to separate subjects or projects — there are eight.",
    ],
    faqs: [
      { q: "Does it work offline on a Chromebook?", a: "Yes, after you've loaded it once. A service worker caches the app, and notes are stored locally in IndexedDB." },
      { q: "Will my notes follow me to another Chromebook with the same Google account?", a: "No. Notes aren't synced through your Google account; they stay in this browser profile on this device." },
      { q: "Can I use it in tablet mode?", a: "You can create and edit notes. The floating window behaviour depends on ChromeOS window management and is designed for desktop/laptop use." },
    ],
    related: ["always-on-top-notes-windows", "online-exam-notes-ethics", "floating-meeting-notes"],
  },
  {
    slug: "sticky-notes-over-zoom",
    title: "Sticky Notes Over Zoom — Keep Notes Visible During Calls",
    h1: "Keep sticky notes visible over Zoom",
    metaDescription:
      "Zoom full screen hides normal note apps. Float a sticky note above Zoom with Chrome or Edge — free, no install, notes never leave your device.",
    intro:
      "When Zoom goes full screen or you're presenting, ordinary note windows vanish behind it. A Document Picture-in-Picture window from Chrome or Edge stays above Zoom, so your agenda, talking points or questions stay in view. It's a separate OS window, not part of Zoom, and nothing you type is uploaded.",
    steps: [
      "Before the call, open the app in Chrome or Edge and write your agenda or talking points.",
      "Click the pop-out button so the note floats.",
      "Join the Zoom meeting and resize the floating note to a slim strip near your camera.",
      "Tick off checklist items (\"[ ] \" makes a checkbox) as you cover them.",
      "After the call, add action items in the same note and export as markdown if needed.",
    ],
    tips: [
      "Place the note just below your webcam so you keep eye contact while reading.",
      "When screen sharing in Zoom, pick a specific window rather than \"Screen\" if you don't want the note visible.",
      "Use a high-contrast colour (yellow or white) so text stays readable over busy video.",
    ],
    faqs: [
      { q: "Will other people on the call see my note?", a: "Not unless you share your entire screen — then anything on it may be visible. Sharing a single window usually leaves the floating note out; check Zoom's share preview." },
      { q: "Does it work with the Zoom desktop app or only Zoom in the browser?", a: "Both. The floating note is its own window from Chrome/Edge, so it sits above the Zoom desktop app too." },
      { q: "Does Zoom have access to the note?", a: "No. The note lives in your browser's local storage; Zoom and our servers never receive it." },
    ],
    related: ["sticky-notes-over-teams", "sticky-notes-over-google-meet", "floating-meeting-notes"],
  },
  {
    slug: "sticky-notes-over-teams",
    title: "Sticky Notes Over Microsoft Teams Calls — Free Floating Notes",
    h1: "Floating sticky notes over Microsoft Teams",
    metaDescription:
      "Keep talking points on top of a Teams meeting. A free floating note from Chrome or Edge stays above Teams, even maximised. No install, stays on-device.",
    intro:
      "Teams meeting windows are usually maximised, and the Teams meeting notes feature stores content in Microsoft 365. If you'd rather keep private notes on your own device, open a floating note from Edge or Chrome — it stays above the Teams window while you talk.",
    steps: [
      "Open the app in Edge or Chrome 116+.",
      "Write your points for the meeting, one per line or as a checklist.",
      "Press the pop-out button to float the note.",
      "Join the Teams meeting; the note stays above the Teams window.",
      "Capture decisions and owners during the call, then export to markdown or paste into your tracker.",
    ],
    tips: [
      "Edge is already installed on Windows, so it's the quickest way to get the floating window on a work PC.",
      "Your company may restrict browser features or extensions; this app needs no extension, just a modern Edge/Chrome.",
      "Keep sensitive customer data out of any notes tool your company hasn't approved — local storage is private, but policy still applies.",
    ],
    faqs: [
      { q: "Is this different from Teams' own meeting notes?", a: "Yes. Teams notes are stored in Microsoft 365 and shared with attendees. These notes are private and stored only in your browser." },
      { q: "Does it work with the new Teams app?", a: "Yes — the floating note is an independent browser window, so it doesn't depend on which Teams client you use." },
      { q: "Can I share the notes with attendees afterwards?", a: "Export the note as a .md file or copy the text and paste it into chat or email. There are no share links, by design." },
    ],
    related: ["sticky-notes-over-zoom", "floating-meeting-notes", "always-on-top-notes-windows"],
  },
  {
    slug: "sticky-notes-over-google-meet",
    title: "Sticky Notes Over Google Meet — Notes That Stay on Top",
    h1: "Sticky notes that stay on top of Google Meet",
    metaDescription:
      "Meet runs in a browser tab, so notes in another tab get hidden. Float a note above Google Meet with Chrome's Picture-in-Picture window. Free, private.",
    intro:
      "Google Meet runs in a browser tab, so switching to a notes tab means losing sight of the call. A Document Picture-in-Picture note floats in its own always-on-top window, so you can keep Meet full-size and your notes on top of it.",
    steps: [
      "Open the app in a separate Chrome or Edge tab.",
      "Prepare your note: agenda, names, questions.",
      "Click the pop-out button — the note moves into a floating window.",
      "Switch back to the Meet tab; the note stays visible on top.",
      "Close the floating window when done; the note is saved locally.",
    ],
    tips: [
      "When presenting in Meet, share a tab instead of your whole screen to keep the note private.",
      "Use markdown headings (# ) to split the note into Agenda / Notes / Actions.",
      "Search (/) finds past meeting notes by any word you typed.",
    ],
    faqs: [
      { q: "Does it conflict with Meet's own picture-in-picture?", a: "They're separate windows. Browsers limit each tab to one Document Picture-in-Picture window, but the notes app runs in its own tab, so both can be open." },
      { q: "Is this synced to Google Docs or Keep?", a: "No. Notes are stored only in your browser. Export as markdown if you want to move them into Docs." },
      { q: "Will it work on a phone during Meet?", a: "You can read and edit notes on mobile, but the floating window is desktop-only." },
    ],
    related: ["sticky-notes-over-zoom", "sticky-notes-over-teams", "floating-meeting-notes"],
  },
];
