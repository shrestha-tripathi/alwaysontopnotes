/**
 * crossTabSync — keep sibling tabs of /app consistent via BroadcastChannel.
 *
 * Same-origin tabs already SHARE the IndexedDB store, so we never put note
 * CONTENT on the wire — we broadcast only "what changed" (an id + timestamp).
 * The receiving tab re-reads the canonical record from storage and patches its
 * own in-memory store. This keeps messages tiny and makes storage the single
 * source of truth (SPEC-Phase2 §7).
 *
 * Transport-only by design: this module knows nothing about the store. The
 * store wires `subscribe()` to apply inbound changes and calls `broadcast()`
 * after each successful local persist. That keeps the protocol unit-testable
 * and the store backend-agnostic.
 *
 * ── Protocol ────────────────────────────────────────────────────────────
 *   put{id, updatedAt} — a note was created or edited (color/pin/body/title).
 *                        Carries updatedAt so the receiver can last-write-wins
 *                        and ignore a stale echo that lost a race.
 *   remove{id}         — a note was hard-deleted (the 5s undo already elapsed).
 *
 * Every same-origin mutation in v1 targets exactly one note by id, so these
 * two messages cover 100% of state changes. (A future bulk op — Phase 4
 * import / clear-all — would add a `relist` broadcast; intentionally omitted
 * now rather than ship an untested dead path. See §7.)
 *
 * ── Safety ──────────────────────────────────────────────────────────────
 *  - Echo-guard: every message is stamped with this tab's `MY_TAB` id; we drop
 *    messages whose origin is ourselves, so A→B→A feedback loops can't form.
 *  - Graceful degrade: if BroadcastChannel is unavailable (older Safari,
 *    sandboxed contexts) the module no-ops cleanly — the app still works, it
 *    just won't live-sync across tabs.
 *  - The receive path is fully try/catch-wrapped by the store; a malformed
 *    message must never crash the editor.
 */

export type SyncMsg =
  | { t: "put"; id: string; updatedAt: number; origin: string }
  | { t: "remove"; id: string; origin: string };

/** Payload callers pass to broadcast() — origin is stamped internally. */
export type OutboundMsg = Omit<Extract<SyncMsg, { t: "put" }>, "origin"> | Omit<Extract<SyncMsg, { t: "remove" }>, "origin">;

/** What the store reacts to (origin already stripped + validated). */
export type InboundMsg =
  | { t: "put"; id: string; updatedAt: number }
  | { t: "remove"; id: string };

const CHANNEL = "aotn:notes";

/** This tab's identity — the echo-guard origin. Stable for the tab's life. */
const MY_TAB =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tab_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

/** Feature-detect once. null channel = unsupported → all ops no-op. */
const channel: BroadcastChannel | null = (() => {
  try {
    if (typeof BroadcastChannel === "undefined") return null;
    return new BroadcastChannel(CHANNEL);
  } catch {
    return null;
  }
})();

/** True when live cross-tab sync is actually available (for diagnostics). */
export const crossTabAvailable = (): boolean => channel !== null;

/** Announce a local change to sibling tabs. No-ops if unsupported. */
export function broadcast(msg: OutboundMsg): void {
  if (!channel) return;
  try {
    channel.postMessage({ ...msg, origin: MY_TAB });
  } catch {
    // postMessage can throw on un-cloneable payloads — ours are plain data,
    // so this is just belt-and-suspenders. Never let it bubble.
  }
}

/**
 * Subscribe to changes from OTHER tabs. Returns an unsubscribe fn.
 * The handler only ever sees foreign, well-formed messages (our own echoes
 * and malformed payloads are filtered here).
 */
export function subscribe(handler: (msg: InboundMsg) => void): () => void {
  if (!channel) return () => {};
  const onMessage = (ev: MessageEvent): void => {
    try {
      const m = ev.data as Partial<SyncMsg> | null;
      if (!m || typeof m !== "object") return;
      if (m.origin === MY_TAB) return; // ignore our own echoes
      if (m.t === "put") {
        if (typeof m.id === "string" && typeof m.updatedAt === "number") {
          handler({ t: "put", id: m.id, updatedAt: m.updatedAt });
        }
      } else if (m.t === "remove") {
        if (typeof m.id === "string") {
          handler({ t: "remove", id: m.id });
        }
      }
    } catch {
      // A malformed cross-tab message must never crash the editor.
    }
  };
  channel.addEventListener("message", onMessage);
  return () => channel.removeEventListener("message", onMessage);
}
