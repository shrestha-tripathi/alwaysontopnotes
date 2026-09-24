import type { PseoEntry } from "./pseo";

export const part2: PseoEntry[] = [
  {
    slug: "sticky-notes-over-netflix",
    title: "Sticky Notes Over Netflix — Take Notes While Watching",
    h1: "Take notes on top of Netflix",
    metaDescription:
      "Learning a language or tracking a series? Keep a floating note above Netflix in the browser — free, no install, notes stay on your device.",
    intro:
      "Watching Netflix in a maximised browser window leaves no room for a notes app. A floating Document Picture-in-Picture note sits above the video so you can jot down vocabulary, quotes or episode details without pausing to switch windows.",
    steps: [
      "Open the app in Chrome or Edge and create a note for the show.",
      "Press the pop-out button to float it.",
      "Start Netflix in another tab or window and make it as large as you like.",
      "Shrink the note to a narrow strip at the edge of the screen and type as you watch.",
      "Pin the note so it's easy to find for the next episode.",
    ],
    tips: [
      "For language learning, use a two-column habit: word – meaning, one per line, then export to import into flashcards.",
      "If the browser's own full-screen mode hides the note on your setup, maximise the window instead of using full screen.",
      "Choose a dark-friendly colour so the note isn't glaring over a dark scene.",
    ],
    faqs: [
      { q: "Does the note appear in screenshots of the video?", a: "Netflix blocks most screenshots of its video anyway; the floating note is just a normal window on your screen." },
      { q: "Does this work with the Netflix Windows app?", a: "The floating note is an OS-level window from Chrome/Edge, so it can sit above other apps too; it isn't tied to Netflix in any way." },
      { q: "Does it read what I'm watching?", a: "No. It has no access to other tabs or apps and stores only what you type, locally." },
    ],
    related: ["sticky-notes-over-youtube", "notes-while-gaming", "always-on-top-notes-windows"],
  },
  {
    slug: "sticky-notes-over-youtube",
    title: "Take Notes Over YouTube Videos — Floating Notes for Tutorials",
    h1: "Floating notes over YouTube tutorials and lectures",
    metaDescription:
      "Follow a YouTube tutorial or lecture with a note that floats above the video. Checkboxes, markdown, export — free, private, no install.",
    intro:
      "Tutorials and lectures on YouTube are easier to follow when your notes don't cover the player or live in another tab. Float a note above the video, type timestamps and steps as you go, and export clean markdown at the end.",
    steps: [
      "Open the app in Chrome or Edge and create a note titled after the video.",
      "Pop it out into the floating window.",
      "Play the video in another tab or window at the size you want.",
      "Type timestamps (e.g. 12:40) with key points, or use \"[ ] \" checkboxes for tutorial steps.",
      "Export the note as .md for your notes folder, Obsidian vault or study docs.",
    ],
    tips: [
      "Use \"# \" headings per chapter of the video to keep long lecture notes scannable.",
      "Code tutorials: wrap snippets in backticks for inline code so they stand out.",
      "Keep one note per course and pin the one you're currently studying.",
    ],
    faqs: [
      { q: "Can I paste YouTube links with timestamps?", a: "Yes. Links are clickable; a plain click opens them in a new tab when no text is selected." },
      { q: "Does it work with YouTube's own mini-player?", a: "They're independent. The note is its own floating window from the notes tab." },
      { q: "Can I import the notes into Obsidian or Notion?", a: "Export gives standard markdown files, which Obsidian opens directly and Notion can import." },
    ],
    related: ["sticky-notes-over-netflix", "floating-meeting-notes", "sticky-notes-chromebook"],
  },
  {
    slug: "notes-while-gaming",
    title: "Notes While Gaming — Floating Checklist Over Your Game",
    h1: "Keep notes on screen while gaming",
    metaDescription:
      "Track quests, builds or routes with a sticky note that floats over windowed and borderless games. Free, no overlay software, notes stay on your PC.",
    intro:
      "Alt-tabbing to check a build order or quest list breaks your flow. A floating note from Chrome or Edge stays above games running in windowed or borderless-windowed mode. It's a normal OS window, not an injected overlay, so it doesn't hook into the game.",
    steps: [
      "Set the game to windowed or borderless windowed (exclusive full screen usually draws over everything).",
      "Open the app in Chrome or Edge and write your checklist, route or build.",
      "Press the pop-out button and drag the note to a corner of the screen.",
      "Tick off items as you go — click the checkbox or edit text without leaving the game for long.",
      "Keep a separate pinned note per game.",
    ],
    tips: [
      "Exclusive full-screen mode in many games will cover any other window; borderless is the reliable option.",
      "Clicking the note takes keyboard focus from the game — click back into the game before using hotkeys.",
      "On a second monitor you can skip the floating window entirely, but it still helps when the browser is hidden behind other apps.",
    ],
    faqs: [
      { q: "Is this an overlay like Discord or Steam's?", a: "No. It doesn't inject into the game; it's a separate always-on-top browser window, so it only shows over windowed/borderless games." },
      { q: "Could it get me banned by anti-cheat?", a: "It doesn't touch game memory or processes — it's just a browser window. Game rules differ, so check them if you play competitively." },
      { q: "Does it affect performance?", a: "It's a small, mostly static page. The impact is similar to any other browser window left open." },
    ],
    related: ["always-on-top-notes-windows", "sticky-notes-over-netflix", "sticky-notes-over-youtube"],
  },
  {
    slug: "notes-for-online-interviews",
    title: "Notes for Online Interviews — Keep Your Questions Visible",
    h1: "Notes for video interviews, used honestly",
    metaDescription:
      "Keep your questions, key stories and the interviewer's names on a floating note during a video interview. Plus when using notes is (and isn't) OK.",
    intro:
      "Many interviewers are fine with you glancing at a few notes: your questions for them, names, and reminders of stories you want to tell. A floating note keeps those near your camera. Don't use it to read out scripted answers or anything the interviewer has said is off-limits; if you aren't sure, ask.",
    steps: [
      "Before the interview, write short bullets: your questions, interviewers' names, 3–4 story prompts.",
      "Open the note in Chrome or Edge and press the pop-out button.",
      "Place it right under your webcam so glances look natural.",
      "During the call, jot down things the interviewer mentions to follow up on.",
      "Afterwards, add impressions and next steps while they're fresh.",
    ],
    tips: [
      "Keywords beat full sentences — reading a script is obvious on camera.",
      "If it's a technical or assessment round with stated rules (no notes, no second screen), close the note.",
      "If you share your screen for a coding exercise, share only the relevant window.",
    ],
    faqs: [
      { q: "Is it OK to use notes in an interview?", a: "For your own questions and reminders it's usually fine, and some candidates say so up front. If an interviewer or assessment says no notes, follow that — this tool doesn't hide itself and isn't meant to." },
      { q: "Can the interviewer see the note?", a: "Only if you share your entire screen or it's visible on your camera. It isn't hidden from screen capture." },
      { q: "Where are my interview notes stored?", a: "In your browser on your device. Nothing is uploaded." },
    ],
    related: ["online-exam-notes-ethics", "sticky-notes-over-zoom", "sticky-notes-over-teams"],
    ethicsNote: true,
  },
  {
    slug: "online-exam-notes-ethics",
    title: "Sticky Notes and Online Exams — What's Allowed",
    h1: "Using notes during online exams: open-book yes, proctored no",
    metaDescription:
      "Floating notes help with open-book tests and self-study. For proctored or closed-book exams, don't use them. Here's how to use notes the right way.",
    intro:
      "A floating note is handy for open-book assessments, practice quizzes and self-study where notes are explicitly permitted. It is not a way around the rules of a closed-book or proctored exam — it's an ordinary window that proctoring software and screen shares can see, and using it where notes are banned is academic misconduct.",
    steps: [
      "Check the exam rules: open-book, notes allowed, or closed-book/proctored.",
      "If notes are allowed, prepare a concise summary note: formulas, definitions, key dates.",
      "Open it in Chrome or Edge and pop it out so it floats beside the exam tab.",
      "For practice tests, record the questions you got wrong in a separate note to review later.",
      "If the exam is closed-book or proctored, close the app entirely before starting.",
    ],
    tips: [
      "Organise by topic with \"# \" headings so you can find things fast under time pressure.",
      "Search (/) jumps to any keyword across all your notes.",
      "Proctoring tools often block or flag extra windows; they may end your attempt. Don't risk it.",
    ],
    faqs: [
      { q: "Can proctoring software detect the floating note?", a: "Assume yes. It's a normal OS window with no stealth features. Don't use it where notes aren't allowed." },
      { q: "Is it good for open-book exams?", a: "Yes — a searchable, always-visible summary next to the exam is exactly the intended use when your instructor allows notes." },
      { q: "Does it work on a school Chromebook?", a: "Often, but school admins can restrict apps and browser features, and exam lockdown modes block other windows." },
    ],
    related: ["notes-for-online-interviews", "sticky-notes-chromebook", "sticky-notes-over-youtube"],
    ethicsNote: true,
  },
  {
    slug: "floating-meeting-notes",
    title: "Floating Meeting Notes — Agenda, Notes & Action Items On Top",
    h1: "Floating meeting notes that stay above every app",
    metaDescription:
      "A simple meeting-notes routine with an always-on-top note: agenda, live notes, action items, markdown export. Works with any meeting app. Free.",
    intro:
      "Whatever your meeting app, the problem is the same: your notes hide behind the call window. Keep one floating note per meeting with three sections — agenda, notes, actions — and it stays visible the whole time. Export to markdown to paste into email, Slack or your wiki.",
    steps: [
      "Create a note and type a template: \"# Agenda\", \"# Notes\", \"# Actions\".",
      "Fill the agenda before the meeting; add \"[ ] \" checkboxes for action items.",
      "Pop the note out so it floats above Zoom, Teams, Meet or Slack huddles.",
      "Type notes live; assign owners next to action items.",
      "After the meeting, export as markdown or copy the text into your follow-up message.",
    ],
    tips: [
      "Colour-code by meeting type — e.g. yellow for 1:1s, blue for team syncs.",
      "Pin recurring meetings' notes and keep appending with a date heading each week.",
      "Use Ctrl/Cmd+S to force a save before closing; notes also autosave as you type.",
    ],
    faqs: [
      { q: "Can multiple people edit the same note?", a: "No. There's no cloud or collaboration — notes are private to your browser. Share by exporting or copying." },
      { q: "What happens if the browser crashes mid-meeting?", a: "Notes autosave to IndexedDB shortly after you type, so you'd lose at most the last moment of typing." },
      { q: "Does it record or transcribe the meeting?", a: "No. It's a notes app only — it has no access to your microphone or the meeting." },
    ],
    related: ["sticky-notes-over-zoom", "sticky-notes-over-teams", "sticky-notes-over-google-meet"],
  },
];
