/**
 * Tiny typed event emitter. Copied from the FTN / LiveCaptionIt lineage —
 * battle-tested, zero-dep. Used by the notes store to broadcast `change`.
 *
 * Usage:
 *   const e = new Emitter<{ change: State; saved: void }>();
 *   const off = e.on("change", (s) => render(s));
 *   e.emit("change", state);
 *   off(); // unsubscribe
 */
export type Listener<T> = (payload: T) => void;

export class Emitter<Events extends Record<string, unknown>> {
  private listeners: {
    [K in keyof Events]?: Set<Listener<Events[K]>>;
  } = {};

  /** Subscribe. Returns an unsubscribe function. */
  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    (this.listeners[event] ??= new Set()).add(fn);
    return () => this.off(event, fn);
  }

  off<K extends keyof Events>(event: K, fn: Listener<Events[K]>): void {
    this.listeners[event]?.delete(fn);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners[event];
    if (!set) return;
    // Iterate a copy so a listener that unsubscribes mid-emit is safe.
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        // A misbehaving listener must never break sibling listeners.
        console.error("[emitter] listener threw:", err);
      }
    }
  }
}
