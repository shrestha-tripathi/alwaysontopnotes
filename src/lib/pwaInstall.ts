/**
 * PWA install orchestration (Phase 4 · commit 16).
 *
 * - Captures `beforeinstallprompt`, calls preventDefault() so Chrome's mini
 *   infobar doesn't compete with our brand pill, and stashes the event.
 * - Custom install pill (bottom-centre) instead of the default browser chrome.
 * - iOS Safari has no `beforeinstallprompt` → show a manual "Share → Add to
 *   Home Screen" hint after an 8s delay so it doesn't crowd first paint.
 * - `appinstalled` sets a sticky bit; dismiss sets a 14-day cooldown so we're
 *   never the app that begs every visit.
 * - Multi-layer installed-detection (sticky bit / display-mode / iOS standalone).
 *
 * Self-contained: builds its own DOM (no markup needed in app.astro); styles
 * live in the `.aotn-install*` block in global.css. Keys are `aotn:` namespaced.
 */
import { site } from "../site.config";

const DISMISS_KEY = "aotn:pwa-dismissed-at";
const INSTALLED_KEY = "aotn:pwa-installed";
const REMIND_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let pill: HTMLElement | null = null;

function isInstalled(): boolean {
  try {
    if (localStorage.getItem(INSTALLED_KEY) === "1") return true;
  } catch {
    /* storage blocked — fall through to media-query probes */
  }
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  } catch {
    /* ignore */
  }
  if ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone) {
    return true;
  }
  return false;
}

function wasRecentlyDismissed(): boolean {
  try {
    const ts = Number.parseInt(localStorage.getItem(DISMISS_KEY) ?? "", 10);
    return Number.isFinite(ts) && Date.now() - ts < REMIND_AFTER_MS;
  } catch {
    return false;
  }
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) &&
    /Safari/.test(ua) &&
    !/CriOS|FxiOS|EdgiOS/.test(ua)
  );
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function markInstalled(): void {
  try {
    localStorage.setItem(INSTALLED_KEY, "1");
  } catch {
    /* ignore */
  }
}

function hide(): void {
  if (pill) {
    pill.remove();
    pill = null;
  }
}

function dismiss(): void {
  markDismissed();
  hide();
}

const ICON_SVG = `<svg class="aotn-install-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect x="5" y="6" width="22" height="22" rx="3" fill="#facc15" transform="rotate(-4 16 17)"/><rect x="5" y="6" width="22" height="4" rx="1" fill="#eab308" transform="rotate(-4 16 17)"/></svg>`;

function show(ios: boolean): void {
  if (pill || isInstalled()) return;

  pill = document.createElement("div");
  pill.className = "aotn-install";
  pill.setAttribute("role", "dialog");
  pill.setAttribute("aria-label", `Install ${site.name}`);

  if (ios) {
    pill.innerHTML =
      ICON_SVG +
      `<span class="aotn-install-text">Install: tap <strong>Share</strong> &rarr; <strong>Add to Home Screen</strong></span>` +
      `<button type="button" class="aotn-install-x" aria-label="Dismiss">&#10005;</button>`;
  } else {
    pill.innerHTML =
      ICON_SVG +
      `<span class="aotn-install-text">Install <strong>${site.name}</strong></span>` +
      `<button type="button" class="aotn-install-go">Install</button>` +
      `<button type="button" class="aotn-install-x" aria-label="Dismiss">&#10005;</button>`;
  }

  document.body.appendChild(pill);
  pill.querySelector(".aotn-install-x")?.addEventListener("click", dismiss);
  pill.querySelector(".aotn-install-go")?.addEventListener("click", onInstallClick);
}

async function onInstallClick(): Promise<void> {
  if (!deferred) {
    dismiss();
    return;
  }
  try {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      markInstalled();
      hide();
    } else {
      dismiss();
    }
  } catch {
    dismiss();
  }
  deferred = null;
}

export function initPwaInstall(): void {
  if (isInstalled() || wasRecentlyDismissed()) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    show(false);
  });

  window.addEventListener("appinstalled", () => {
    markInstalled();
    hide();
  });

  // iOS Safari never fires beforeinstallprompt — show the manual A2HS hint
  // after a delay so iPhone users still have an install path.
  if (isIosSafari()) {
    window.setTimeout(() => {
      if (!isInstalled() && !wasRecentlyDismissed()) show(true);
    }, 8000);
  }
}
