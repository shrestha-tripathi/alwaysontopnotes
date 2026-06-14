/**
 * In-app theme toggle (Phase 4 · commit 17).
 *
 * Tri-state: dark → light → system. `system` removes the explicit override and
 * follows `prefers-color-scheme` live (via a matchMedia change listener). The
 * resolved theme is written to `data-theme` on <html>; the user's CHOICE (which
 * may be `system`) is persisted to `aotn:theme`.
 *
 * Important: this project themes via the `data-theme` attribute + CSS-variable
 * tokens, NOT Tailwind's `.dark` class — so we swap the three header icons in JS
 * here rather than with `dark:*` utilities (which would silently no-op; see the
 * tailwind-v4-dark-variant-data-theme skill).
 *
 * PiP parity: when a note is floating, the PiP window is a SEPARATE document
 * whose <html> got `data-theme` mirrored once at open time (pipWindow.ts
 * `mirrorAttrs`). A later toggle must re-mirror onto the live float — we read it
 * via the injected `pipWindowRef` getter so this module stays decoupled from the
 * PiP lifecycle.
 */

export type ThemeChoice = "dark" | "light" | "system";

const STORAGE_KEY = "aotn:theme";
const CYCLE: ThemeChoice[] = ["dark", "light", "system"];

const LABELS: Record<ThemeChoice, string> = {
  dark: "dark",
  light: "light",
  system: "system",
};

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return true; // default-dark app
  }
}

/** The CHOICE the user persisted. Missing/garbage → `system` (follow OS). */
function readChoice(): ThemeChoice {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* storage blocked */
  }
  if (raw === "dark" || raw === "light" || raw === "system") return raw;
  // Legacy: commit-1 bootstrap stored a bare "dark"/"light" with no "system"
  // option; anything else (incl. null) means "never chose" → follow OS.
  return "system";
}

function writeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* ignore */
  }
}

/** Resolve a choice to the concrete theme actually applied to the DOM. */
function resolve(choice: ThemeChoice): "dark" | "light" {
  if (choice === "system") return systemPrefersDark() ? "dark" : "light";
  return choice;
}

export interface ThemeToggleOptions {
  /** The toggle button. */
  button: HTMLElement;
  /** Icon elements keyed by the choice they represent. */
  icons: Record<ThemeChoice, HTMLElement | null>;
  /** Live PiP window getter — used to re-mirror data-theme onto an open float. */
  pipWindowRef?: () => Window | null;
}

export function initThemeToggle(opts: ThemeToggleOptions): void {
  const { button, icons, pipWindowRef } = opts;
  let choice = readChoice();

  // Apply the resolved theme to the origin <html> + (if open) the PiP float,
  // and sync the button's icon + a11y label to the CURRENT choice.
  function apply(): void {
    const resolved = resolve(choice);
    document.documentElement.setAttribute("data-theme", resolved);

    // Re-mirror onto a live float so toggling while popped out updates both.
    try {
      const pip = pipWindowRef?.();
      if (pip && !pip.closed) {
        pip.document.documentElement.setAttribute("data-theme", resolved);
      }
    } catch {
      /* float torn down mid-toggle — origin already updated, safe to ignore */
    }

    // Icon swap: exactly one visible, matching the choice (not the resolved
    // theme — `system` shows the monitor even though it resolves dark/light).
    (Object.keys(icons) as ThemeChoice[]).forEach((k) => {
      icons[k]?.classList.toggle("hidden", k !== choice);
    });

    const next = CYCLE[(CYCLE.indexOf(choice) + 1) % CYCLE.length];
    const current =
      choice === "system" ? `system (${resolved})` : LABELS[choice];
    button.setAttribute(
      "aria-label",
      `Theme: ${current}. Switch to ${LABELS[next]}.`,
    );
    button.setAttribute("title", `Theme: ${current} — click for ${LABELS[next]}`);
  }

  button.addEventListener("click", () => {
    choice = CYCLE[(CYCLE.indexOf(choice) + 1) % CYCLE.length];
    writeChoice(choice);
    apply();
  });

  // When following the system, track OS theme changes live (no reload). The
  // listener stays attached always but only re-applies while choice==="system";
  // a pinned dark/light ignores the OS entirely.
  try {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", () => {
      if (choice === "system") apply();
    });
  } catch {
    /* matchMedia unavailable — toggle still works, just no live OS tracking */
  }

  apply();
}
