/**
 * PiP 3D stack switcher (PiP-only quick note picker).
 *
 * The float hides the sidebar, so the only built-in way to change notes is the
 * linear `‹ ›` switcher. This adds a richer "stack" mode: a vertical 3D deck of
 * sticky-note cards (macOS Stacks / vertical cover-flow) you flick through with
 * the wheel / Up-Down / J-K and tap to jump to ANY note fast.
 *
 * Design constraints:
 *  - **PiP-only.** The host overlay lives inside #app-root (so it travels into
 *    the float) but is shown only under `:where(.pip-mode)` — inert in the
 *    two-pane app, which already has the full sidebar list.
 *  - **Windowed render.** Only ~WINDOW cards around focus are in the DOM, so it
 *    stays smooth with hundreds of notes. Uses the store's LIGHT index
 *    (title/preview/color) — never loads a heavy Tiptap doc.
 *  - **3D-trap safe (commit-14 lesson).** `overflow:hidden`/`truncate` FLATTENS
 *    3D transforms. So the transformed element (the card) must NOT clip; the
 *    title/preview truncation lives on INNER spans. Transforms on the outer
 *    `.pip-stack-card`, clipping on `.pip-stack-card-title/-preview`.
 *  - **Reduced-motion.** Collapses to a plain scrollable vertical list (the CSS
 *    `@media (prefers-reduced-motion)` block drops the 3D transforms); behaviour
 *    here stays identical, only the visual depth is removed by CSS.
 *
 * State machine: closed ⇄ open. Opening snapshots the visible list + focuses the
 * active note; moving changes `focusIdx` (clamped, no wrap — matches navigateList);
 * selecting calls `onSelect(id)` and closes; Esc/toggle closes without selecting.
 */
import type { NoteIndexEntry } from "./types";
import type { StickyColor } from "./types";

interface Swatch {
  bg: string;
  edge: string;
  ink: string;
}

export interface PipStackOptions {
  /** The fixed overlay host (inside #app-root so it travels into PiP). */
  host: HTMLElement;
  /** The toggle button in the PiP header. */
  toggleBtn: HTMLElement;
  /** Returns the CURRENT visible (searched/sorted) note list. */
  getVisible: () => NoteIndexEntry[];
  /** Returns the active note id (to focus on open). */
  getActiveId: () => string | null;
  /** Swatch lookup for a colour. */
  swatchOf: (c: StickyColor) => Swatch;
  /** Deterministic ±deg tilt for a note id (visual interest, stable). */
  rotationFor: (id: string) => number;
  /** Select a note by id (jump to it). Called on card click / Enter. */
  onSelect: (id: string) => void;
}

// How many cards above + below focus are VISIBLE (total visible = 2*HALF + 1).
const HALF = 3;
// We actually render ONE extra ring beyond HALF as an invisible buffer, so cards
// ENTER and LEAVE at opacity 0 (offset = ±RENDER_HALF, which the stylesheet fades
// to 0). A freshly-created node can't transition its first paint — doing it at the
// invisible buffer makes that pop imperceptible, while every VISIBLE move is a
// smooth transition of EXISTING nodes (the buttery glide).
const RENDER_HALF = HALF + 1;

export interface PipStackController {
  /** Is the stack currently open? */
  isOpen: () => boolean;
  /** Open the stack (snapshots the list + focuses active). No-op if open. */
  open: () => void;
  /** Close without selecting. No-op if closed. */
  close: () => void;
  /** Toggle open/closed. */
  toggle: () => void;
}

export function initPipStack(opts: PipStackOptions): PipStackController {
  const { host, toggleBtn, getVisible, getActiveId, swatchOf, rotationFor, onSelect } =
    opts;

  let open = false;
  let list: NoteIndexEntry[] = [];
  let focusIdx = 0;

  // Build the static shell once: a backdrop + a centred deck the cards mount in.
  host.classList.add("pip-stack");
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-modal", "true");
  host.setAttribute("aria-label", "Switch note");
  host.innerHTML = `
    <div class="pip-stack-backdrop"></div>
    <div class="pip-stack-deck" role="listbox" aria-label="Notes"></div>
    <div class="pip-stack-hint">↑ ↓ or scroll &middot; Enter to open &middot; Esc to close</div>
  `;
  const deck = host.querySelector<HTMLElement>(".pip-stack-deck")!;
  const backdrop = host.querySelector<HTMLElement>(".pip-stack-backdrop")!;

  // Clicking the backdrop (not a card) closes without selecting.
  backdrop.addEventListener("click", () => close());

  function clampFocus(): void {
    if (list.length === 0) {
      focusIdx = 0;
      return;
    }
    if (focusIdx < 0) focusIdx = 0;
    if (focusIdx >= list.length) focusIdx = list.length - 1;
  }

  function move(delta: number): void {
    if (!open) return;
    focusIdx += delta;
    clampFocus();
    paint();
  }

  // Build one card node (called once per note when it first enters the window).
  function buildCard(entry: NoteIndexEntry): HTMLButtonElement {
    const sw = swatchOf(entry.color);
    // OUTER card owns the 3D transform → must NOT clip (overflow visible).
    const card = document.createElement("button");
    card.type = "button";
    card.className = "pip-stack-card";
    card.dataset.id = entry.id;
    card.id = `pip-stack-${entry.id}`;
    card.setAttribute("role", "option");
    card.style.setProperty("--sw-bg", sw.bg);
    card.style.setProperty("--sw-edge", sw.edge);
    card.style.setProperty("--sw-ink", sw.ink);
    // A stable micro-tilt so the deck doesn't look mechanically uniform.
    card.style.setProperty("--rot", `${rotationFor(entry.id)}deg`);

    // INNER spans carry the truncation (overflow:hidden) — kept OFF the card so
    // they never create a flattening context on the 3D-transformed parent.
    const title = document.createElement("span");
    title.className = "pip-stack-card-title";
    title.textContent = entry.title?.trim() || "Untitled";
    const preview = document.createElement("span");
    preview.className = "pip-stack-card-preview";
    preview.textContent = entry.preview?.trim() || "Empty note";
    card.append(title, preview);

    card.addEventListener("click", () => {
      // Clicking a focused card selects; a non-focused card focuses it (smoothly).
      const idx = list.findIndex((e) => e.id === card.dataset.id);
      if (idx < 0) return;
      if (idx === focusIdx) selectFocused();
      else {
        focusIdx = idx;
        paint();
      }
    });
    return card;
  }

  // Position an EXISTING card at its offset from focus. Setting only the custom
  // props (not recreating the node) lets the CSS `transition` interpolate the
  // transform → the buttery continuous glide. offset 0 = focused/front/upright.
  function positionCard(card: HTMLElement, offset: number): void {
    card.style.setProperty("--offset", String(offset));
    card.style.setProperty("--abs", String(Math.abs(offset)));
    card.dataset.offset = String(offset);
    card.setAttribute("aria-selected", offset === 0 ? "true" : "false");
    card.tabIndex = offset === 0 ? 0 : -1;
  }

  // RECONCILE the deck to the current focus WITHOUT tearing it down. Cards that
  // survive a move keep their DOM node and just get a new --offset → CSS glides
  // them. New entrants mount at the invisible buffer ring (opacity 0) so their
  // un-transitionable first paint is imperceptible; leavers are removed only once
  // they've animated out past the buffer. THIS is what makes switching continuous
  // instead of teleporting (the old render() did deck.textContent="" every move,
  // so every card was born at its final transform — no transition could fire).
  function render(): void {
    if (list.length === 0) {
      deck.textContent = "";
      const empty = document.createElement("div");
      empty.className = "pip-stack-empty";
      empty.textContent = "No notes";
      deck.appendChild(empty);
      return;
    }
    // Drop a stale "No notes" placeholder if we now have notes.
    const stale = deck.querySelector(".pip-stack-empty");
    if (stale) stale.remove();

    const lo = Math.max(0, focusIdx - RENDER_HALF);
    const hi = Math.min(list.length - 1, focusIdx + RENDER_HALF);

    // Index existing card nodes by note id for reuse.
    const existing = new Map<string, HTMLElement>();
    deck.querySelectorAll<HTMLElement>(".pip-stack-card").forEach((el) => {
      if (el.dataset.id) existing.set(el.dataset.id, el);
    });
    // On a FRESH paint (deck empty — i.e. the open() that just cleared it) place
    // cards directly at rest so the deck appears settled & instant. Only once
    // there ARE cards (a move within an open session) do entrants fly in from the
    // buffer edge — that's the continuous glide, not a deal-in on every open.
    const animateEntrants = existing.size > 0;

    const keep = new Set<string>();
    for (let i = lo; i <= hi; i++) {
      const entry = list[i];
      const offset = i - focusIdx;
      keep.add(entry.id);
      let card = existing.get(entry.id);
      if (!card) {
        card = buildCard(entry);
        deck.appendChild(card);
        if (animateEntrants) {
          // Mount pre-positioned at the buffer edge (invisible), commit that
          // start transform, THEN set the real offset so the transition has a
          // start state to glide from. Without the forced reflow both land in
          // one frame and it teleports.
          positionCard(card, offset < 0 ? -RENDER_HALF : RENDER_HALF);
          void card.offsetWidth;
        }
      }
      positionCard(card, offset);
      // z-order: focused on top, neighbours recede.
      card.style.zIndex = String(50 - Math.abs(offset));
    }

    // Remove cards that scrolled out of the render window. They were already at
    // the buffer ring (opacity 0) before leaving, so removal is invisible.
    existing.forEach((el, id) => {
      if (!keep.has(id)) el.remove();
    });
  }

  // Reconcile the deck + keep the aria pointer on the focused card. Cheap to call
  // on every move (render() reuses nodes, so this is a few style writes, not a
  // teardown).
  function paint(): void {
    render();
    const focused = list[focusIdx];
    host.setAttribute(
      "aria-activedescendant",
      focused ? `pip-stack-${focused.id}` : "",
    );
  }

  function selectFocused(): void {
    const entry = list[focusIdx];
    if (!entry) {
      close();
      return;
    }
    onSelect(entry.id);
    close();
  }

  function onKey(e: KeyboardEvent): void {
    if (!open) return;
    switch (e.key) {
      case "ArrowDown":
      case "j":
      case "J":
        e.preventDefault();
        e.stopPropagation();
        move(1);
        break;
      case "ArrowUp":
      case "k":
      case "K":
        e.preventDefault();
        e.stopPropagation();
        move(-1);
        break;
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        selectFocused();
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
      default:
        break;
    }
  }

  let wheelAccum = 0;
  function onWheel(e: WheelEvent): void {
    if (!open) return;
    e.preventDefault();
    // Accumulate so a trackpad's many small deltas don't over-scroll; step at a
    // threshold for a deliberate one-card-per-flick feel.
    wheelAccum += e.deltaY;
    const STEP = 40;
    while (wheelAccum >= STEP) {
      move(1);
      wheelAccum -= STEP;
    }
    while (wheelAccum <= -STEP) {
      move(-1);
      wheelAccum += STEP;
    }
  }

  function open_(): void {
    if (open) return;
    list = getVisible();
    const activeId = getActiveId();
    const ai = activeId ? list.findIndex((e) => e.id === activeId) : -1;
    focusIdx = ai >= 0 ? ai : 0;
    wheelAccum = 0;
    open = true;
    host.classList.add("is-open");
    toggleBtn.setAttribute("aria-expanded", "true");
    // Start each session from a clean deck so the first paint settles instantly
    // (render() deals cards at rest when the deck is empty) rather than gliding
    // stale nodes left over from a previous open.
    deck.textContent = "";
    paint();
    // Listen on the host's OWN document so it works inside the PiP window too.
    const doc = host.ownerDocument;
    doc.addEventListener("keydown", onKey, true);
    host.addEventListener("wheel", onWheel, { passive: false });
  }

  function close(): void {
    if (!open) return;
    open = false;
    host.classList.remove("is-open");
    toggleBtn.setAttribute("aria-expanded", "false");
    const doc = host.ownerDocument;
    doc.removeEventListener("keydown", onKey, true);
    host.removeEventListener("wheel", onWheel);
  }

  function toggle(): void {
    if (open) close();
    else open_();
  }

  toggleBtn.addEventListener("click", () => toggle());

  return {
    isOpen: () => open,
    open: open_,
    close,
    toggle,
  };
}
