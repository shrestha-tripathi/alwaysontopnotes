/**
 * Document Picture-in-Picture wrapper for AlwaysOnTopNotes.
 *
 * Pops the ENTIRE app shell (#app-root) out into a small, always-on-top
 * floating window so a note stays visible while the user works in another
 * app — the headline reason AOTN exists. The sidebar is hidden inside PiP
 * via `:where(.pip-mode)` CSS (see global.css) so a single note fills the
 * float; bringing it back reveals the full two-pane app again.
 *
 * Design constraints (per specs/SPEC-Phase3.md + the
 * `document-pip-app-shell-relocation` skill):
 *
 *  1. Strictly additive. Removing this file + its wiring returns the app to
 *     its exact Phase-2 behavior. We MOVE the existing DOM element — we do
 *     NOT clone, rebuild, or fork the UI tree.
 *  2. All JS state survives the trip: the Tiptap editor instance, the
 *     notesStore singleton, every event listener, the cross-tab channel,
 *     and the floating overlays (#bubble-menu / #toast / #shortcuts-modal,
 *     which are children of #app-root) — because reparenting a node does
 *     NOT change its JS identity, only its parent.
 *  3. Feature-detected at every entry point. Firefox / Safari / mobile
 *     silently no-op; the toggle button is never unhidden there.
 *  4. The PiP window's own title-bar close button is the primary exit; we
 *     also expose programmatic `closePip()` for the in-tab toggle.
 *
 * The single load-bearing line is:
 *
 *   pipWindow.document.body.appendChild(opts.sourceEl)
 *
 * Move the ELEMENT (#app-root) itself — not its children — so CSS rules
 * scoped under `:where(.pip-mode) #app-root … ` match inside the PiP doc.
 * Everything else (stylesheet clone, attr mirror, restore safety net) is
 * defensive scaffolding around that one move.
 *
 * AOTN-specific generalization vs FTN's original: `mirrorAttrs` copies
 * attributes (default `data-theme`) from the origin <html> onto the PiP
 * <html>, so the floating note renders in the user's chosen theme instead
 * of falling back to the :root (dark) defaults.
 */

type PipHandle = {
  /** The PiP window itself; null once closed. */
  window: Window | null;
  /** Programmatic close — triggers the same restore path as a user click. */
  close: () => void;
};

type OpenPipOptions = {
  /**
   * Element to move into the PiP window. The element ITSELF is reparented
   * (not its children) so CSS scoped to it (`:where(.pip-mode) #app-root`)
   * keeps matching inside the PiP doc. For AOTN this is `#app-root`.
   */
  sourceEl: HTMLElement;
  /** Element shown in the origin tab while PiP is open. */
  placeholderEl: HTMLElement;
  /** Initial PiP window dimensions (px). Browser may clamp to screen size. */
  width: number;
  height: number;
  /**
   * Called after restore completes (element moved back, placeholder hidden).
   * Use to flip the toggle icon, rebind state, etc. NOT called if the open
   * itself failed.
   */
  onClose: () => void;
  /**
   * Called right after the window opens and the shell has been moved in —
   * BEFORE returning the handle. Use to re-focus the editor (reparenting a
   * focused contentEditable blurs it) and to rebind the keymap onto the PiP
   * document. Receives the PiP window.
   */
  onOpen?: (pipWindow: Window) => void;
  /**
   * Attribute names to copy from the origin <html> to the PiP <html> on
   * open. Defaults to `["data-theme"]` so the floating note honors the
   * user's light/dark choice.
   */
  mirrorAttrs?: string[];
  /** Optional PiP document title. Defaults to "📺 <origin title>". */
  pipTitle?: string;
};

/**
 * Module-level handle so callers can ask "is PiP active right now?" without
 * re-querying `documentPictureInPicture.window` (cleared async after close).
 */
let active: PipHandle | null = null;

/**
 * Feature detection. Chromium 116+ desktop only. False on Firefox, Safari,
 * Chrome Android, iOS Safari, and any SSR context.
 */
export function isPipSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "documentPictureInPicture" in window;
}

/** True iff a PiP window is currently open and owned by us. */
export function isPipOpen(): boolean {
  return !!active?.window && !active.window.closed;
}

/** The live PiP window, or null. Lets callers target it (e.g. rebind keys). */
export function pipWindowRef(): Window | null {
  return isPipOpen() ? active!.window : null;
}

/**
 * Open the PiP window and move `sourceEl` into it. Returns a handle with a
 * `close()` method; null on any failure (popup blocker, unsupported browser,
 * already-open, missing user gesture). Failures are logged via console.warn.
 */
export async function openPip(opts: OpenPipOptions): Promise<PipHandle | null> {
  if (!isPipSupported()) {
    console.warn("[pip] Document PiP not supported in this browser");
    return null;
  }
  if (isPipOpen()) {
    // Already open — return the existing handle so callers can toggle.
    return active;
  }

  const docPip = (
    window as unknown as {
      documentPictureInPicture: {
        requestWindow(opts: { width: number; height: number }): Promise<Window>;
        window: Window | null;
      };
    }
  ).documentPictureInPicture;

  let pipWindow: Window;
  try {
    pipWindow = await docPip.requestWindow({
      width: opts.width,
      height: opts.height,
    });
  } catch (err) {
    // Common rejections: not a user gesture, popup blocked, browser refused.
    // Don't crash — log and let the caller surface a toast.
    console.warn("[pip] requestWindow rejected:", err);
    return null;
  }

  // 1) Mark the PiP document so our `:where(.pip-mode)` rules apply.
  pipWindow.document.documentElement.classList.add("pip-mode");

  // 2) Mirror theme (and any other requested attrs) from origin <html> →
  //    PiP <html>, so the floating note honors the user's light/dark choice
  //    instead of falling back to the :root dark defaults.
  const attrs = opts.mirrorAttrs ?? ["data-theme"];
  for (const name of attrs) {
    const val = document.documentElement.getAttribute(name);
    if (val !== null) pipWindow.document.documentElement.setAttribute(name, val);
  }

  // 3) Clone origin stylesheets into PiP (Tailwind utilities, @theme tokens,
  //    inline Astro CSS all live in <head>). CLONE not move — the origin tab
  //    still needs them for the placeholder UI and after restore.
  copyStylesheetsTo(pipWindow.document);

  // 4) Title for the OS window-switcher / taskbar.
  pipWindow.document.title = opts.pipTitle ?? `📺 ${document.title}`;

  // 5) THE LOAD-BEARING MOVE. Reparent the element ITSELF (not its children)
  //    so `:where(.pip-mode) #app-root …` rules fire inside PiP. All JS state
  //    (Tiptap instance, store, listeners, overlays) survives because the
  //    node's identity is unchanged — only its parent moves.
  //
  //    Remember origin position so restore puts it back EXACTLY where it was.
  const originParent = opts.sourceEl.parentNode;
  const originNextSibling = opts.sourceEl.nextSibling;
  if (!originParent) {
    console.warn("[pip] sourceEl has no parent — aborting");
    try {
      pipWindow.close();
    } catch {
      /* ignore */
    }
    return null;
  }
  pipWindow.document.body.appendChild(opts.sourceEl);

  // 6) Show the placeholder in the origin tab.
  opts.placeholderEl.classList.remove("hidden");

  // 7) Let the caller re-focus the editor + rebind the keymap onto the PiP
  //    document now that the shell lives there.
  if (opts.onOpen) {
    try {
      opts.onOpen(pipWindow);
    } catch (err) {
      console.warn("[pip] onOpen callback threw:", err);
    }
  }

  // 8) Restore. Three independent triggers; restore() runs at most once
  //    (guarded by `restoreRan`):
  //      a) PiP `pagehide` (normal close — X, Esc, OS close, programmatic)
  //      b) PiP `unload` (extra defense for browsers firing one not the other)
  //      c) origin-focus safety net if both somehow missed
  let restoreRan = false;
  const restore = () => {
    if (restoreRan) return;
    restoreRan = true;
    try {
      // insertBefore with a null ref-node appends at end, so the original
      // sibling order (relative to #pip-placeholder) is always preserved.
      originParent.insertBefore(opts.sourceEl, originNextSibling);
    } catch (err) {
      console.warn("[pip] restore insertBefore failed:", err);
    }
    opts.placeholderEl.classList.add("hidden");
    active = null;
    try {
      opts.onClose();
    } catch (err) {
      console.warn("[pip] onClose callback threw:", err);
    }
  };

  pipWindow.addEventListener("pagehide", restore);
  pipWindow.addEventListener("unload", restore);

  const safetyNet = () => {
    if (active && active.window && active.window.closed && !restoreRan) {
      console.warn("[pip] safety-net restore fired (pagehide/unload missed)");
      restore();
    }
  };
  window.addEventListener("focus", safetyNet);
  pipWindow.addEventListener("pagehide", () => {
    window.removeEventListener("focus", safetyNet);
  });

  active = {
    window: pipWindow,
    close: () => {
      try {
        pipWindow.close();
      } catch (err) {
        console.warn("[pip] close() threw:", err);
      }
      // pagehide will fire and run restore.
    },
  };

  return active;
}

/**
 * Programmatic close of the active PiP window. No-op if none open. The
 * restore path runs via the PiP window's pagehide handler so the close path
 * stays single-sourced.
 */
export function closePip(): void {
  if (!active) return;
  active.close();
}

/**
 * Clone every <link rel="stylesheet"> and <style> from the origin <head>
 * into the PiP <head>. CLONED not moved — the origin tab still needs them.
 */
function copyStylesheetsTo(targetDoc: Document): void {
  const head = targetDoc.head;
  const tags = document.head.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
    'link[rel="stylesheet"], style',
  );
  tags.forEach((tag) => {
    // importNode satisfies strict cross-document parentage checks (some
    // browsers refuse appendChild of a foreign-doc node directly).
    const clone = targetDoc.importNode(tag, true);
    head.appendChild(clone);
  });

  // Mirror <style>/<link> tags added to origin head at runtime (belt and
  // suspenders — cheap insurance).
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as Element;
        if (
          el.tagName === "STYLE" ||
          (el.tagName === "LINK" && el.getAttribute("rel") === "stylesheet")
        ) {
          try {
            head.appendChild(targetDoc.importNode(el, true));
          } catch (err) {
            console.warn("[pip] failed to mirror new stylesheet:", err);
          }
        }
      });
    }
  });
  observer.observe(document.head, { childList: true });
  targetDoc.defaultView?.addEventListener("pagehide", () => observer.disconnect());
}
