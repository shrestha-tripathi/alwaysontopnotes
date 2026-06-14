/**
 * One-step onboarding pointer for the Document Picture-in-Picture
 * feature on /app.
 *
 * Minimal version of the `zero-dep-onboarding-tour` pattern — no
 * Next/Back/step counter, just a spotlight + popover with a single
 * dismiss button. Fires once per user (localStorage-gated) on first
 * visit to /app on a desktop Chromium browser.
 *
 * Why this is a separate module:
 *  - Single-purpose: only the PiP feature (the headline reason AOTN
 *    exists — a note that floats always-on-top while you work).
 *  - Tiny: ~120 LOC. Independently revertable: delete this file +
 *    remove the `initPipTour()` call and PiP still works (just less
 *    discoverable).
 *
 * The whole module no-ops on:
 *  - SSR (no `window`)
 *  - Browsers without Document PiP support (so the tour never points
 *    at a button that's hidden — FF / Safari / mobile)
 *  - Returning users (localStorage sticky bit)
 *  - Pages where the anchor element doesn't exist or is still hidden
 *
 * Timing: fires ~2.8s after first paint so it never fights the
 * first-run welcome note (seeded immediately) for attention.
 */

const SEEN_KEY = "aotn:pip-tour-seen-v1";
const ANCHOR_SELECTOR = "#pip-toggle";
/**
 * Delay before the pointer fires. Gives the first-run welcome note +
 * PiP-button feature detection time to settle so the tour doesn't
 * compete with the welcome note for the user's first glance.
 */
const FIRST_RUN_DELAY_MS = 2800;

function hasBeenSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Private mode / strict iframe → treat as "seen" so we never
    // pester users whose storage we can't persist to anyway.
    return true;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode — accept the small annoyance of re-firing next session */
  }
}

/**
 * Build the spotlight + popover DOM and append to <body>. Returns refs
 * so the orchestrator can position + later remove them.
 */
function buildTourUi() {
  const backdrop = document.createElement("div");
  backdrop.className = "aotn-pip-tour-backdrop";

  const spotlight = document.createElement("div");
  spotlight.className = "aotn-pip-tour-spotlight";

  const popover = document.createElement("div");
  popover.className = "aotn-pip-tour-popover";
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-modal", "true");
  popover.setAttribute("aria-labelledby", "aotn-pip-tour-title");
  popover.innerHTML = `
    <button class="aotn-pip-tour-close" aria-label="Dismiss" type="button">×</button>
    <h3 id="aotn-pip-tour-title" class="aotn-pip-tour-title">Float this note 📌</h3>
    <p class="aotn-pip-tour-body">Pop the note out into a small always-on-top window — it stays visible while you work in another app. Switch notes right from the float.</p>
    <div class="aotn-pip-tour-actions">
      <button class="aotn-pip-tour-got-it" type="button">Got it</button>
    </div>
  `;

  document.body.append(backdrop, spotlight, popover);
  return { backdrop, spotlight, popover };
}

/**
 * Position the spotlight box around the anchor and the popover below
 * (or above, if there's no room below). Clamped to viewport so we
 * never paint off-screen.
 */
function positionUi(
  ui: { spotlight: HTMLElement; popover: HTMLElement },
  anchor: HTMLElement,
): void {
  const rect = anchor.getBoundingClientRect();
  const pad = 8;
  // Clamp the spotlight box to the viewport so it never clips off the top/left
  // edge. The PiP button lives in a 48px header flush to the top, so an 8px
  // pad would push the spotlight to top:-0.5px and clip the ring. Floor at a
  // small margin and shrink the box so it still frames the button cleanly.
  const edge = 4;
  const rawTop = rect.top - pad;
  const spotTop = Math.max(edge, rawTop);
  const rawLeft = rect.left - pad;
  const spotLeft = Math.max(edge, rawLeft);
  Object.assign(ui.spotlight.style, {
    top: `${spotTop}px`,
    left: `${spotLeft}px`,
    width: `${rect.width + pad * 2 - (spotLeft - rawLeft)}px`,
    height: `${rect.height + pad * 2 - (spotTop - rawTop)}px`,
  });

  const popoverWidth = 290;
  const viewportPad = 12;
  // Center horizontally on anchor, then clamp inside viewport. The PiP
  // button lives top-right, so this usually clamps to the right edge.
  let left = rect.left + rect.width / 2 - popoverWidth / 2;
  left = Math.max(viewportPad, Math.min(window.innerWidth - popoverWidth - viewportPad, left));

  // Place below if there's room (≥160px), else above.
  const conservativeHeight = 160;
  const spaceBelow = window.innerHeight - rect.bottom;
  const top =
    spaceBelow >= conservativeHeight + 20
      ? rect.bottom + 14
      : Math.max(viewportPad, rect.top - conservativeHeight - 14);

  Object.assign(ui.popover.style, {
    top: `${top}px`,
    left: `${left}px`,
    width: `${popoverWidth}px`,
  });
}

/**
 * Show the tour. Safe to call when not first-run (returns false).
 * Forceable for a future "replay" button in the shortcuts modal.
 */
export function startPipTour(opts?: { force?: boolean }): boolean {
  if (typeof window === "undefined") return false;
  if (!opts?.force && hasBeenSeen()) return false;
  // Don't double-mount.
  if (document.querySelector(".aotn-pip-tour-popover")) return false;

  const anchor = document.querySelector<HTMLElement>(ANCHOR_SELECTOR);
  if (!anchor) return false;
  // Don't point at a hidden anchor — happens if feature-detection
  // didn't unhide the button (unsupported browser).
  if (anchor.classList.contains("hidden")) return false;

  const ui = buildTourUi();

  let dismissed = false;
  const finish = () => {
    if (dismissed) return;
    dismissed = true;
    markSeen();
    ui.backdrop.classList.add("aotn-pip-tour-leaving");
    ui.popover.classList.add("aotn-pip-tour-leaving");
    setTimeout(() => {
      ui.backdrop.remove();
      ui.popover.remove();
      ui.spotlight.remove();
    }, 200);
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition);
    window.removeEventListener("keydown", onKey);
  };

  const reposition = () => positionUi(ui, anchor);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      finish();
    }
  };

  ui.popover.querySelector<HTMLButtonElement>(".aotn-pip-tour-got-it")?.addEventListener(
    "click",
    finish,
  );
  ui.popover.querySelector<HTMLButtonElement>(".aotn-pip-tour-close")?.addEventListener(
    "click",
    finish,
  );
  // Click anywhere on the dimmed backdrop also dismisses — matches the
  // muscle memory of every modal everywhere.
  ui.backdrop.addEventListener("click", finish);

  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, { passive: true });
  window.addEventListener("keydown", onKey);

  positionUi(ui, anchor);
  // Second pass after layout settles — popover height is unknown until
  // it paints, so the first positionUi() uses a conservative estimate.
  requestAnimationFrame(() => positionUi(ui, anchor));

  return true;
}

/**
 * Entry point — call once from /app's init script. Bails silently if
 * anything would make the tour pointless (SSR, returning user,
 * unsupported browser, missing/hidden anchor).
 */
export function initPipTour(): void {
  if (typeof window === "undefined") return;
  if (hasBeenSeen()) return;

  setTimeout(() => {
    // Re-check inside the timer — the user might have done something in
    // the meantime that obviates the tour (e.g. already popped out).
    const anchor = document.querySelector<HTMLElement>(ANCHOR_SELECTOR);
    if (!anchor || anchor.classList.contains("hidden")) return;
    startPipTour();
  }, FIRST_RUN_DELAY_MS);

  // Debug helper for support — "type this in DevTools and refresh."
  (window as unknown as { __resetPipTour: () => void }).__resetPipTour = () => {
    try {
      localStorage.removeItem(SEEN_KEY);
    } catch {
      /* private mode */
    }
    console.info("[pip-tour] Reset — refresh to see it again.");
  };
}
