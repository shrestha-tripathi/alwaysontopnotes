/**
 * Storage entry point — the single place that decides WHERE notes live.
 *
 * Commit 7: IndexedDB is the primary backend. If IndexedDB is unavailable
 * (rare — some private-mode browsers, sandboxed contexts, disabled storage),
 * we fall back to the in-memory adapter so the app still RUNS (notes just
 * won't survive reload) instead of hard-failing on boot.
 *
 * A future OPFS / sqlite-wasm migration is likewise just an edit here — the
 * store and UI never change because they only ever see the `StorageAdapter`
 * interface. That's the whole point of this seam.
 */
import type { StorageAdapter } from "./types";
import { makeMemoryAdapter } from "./memoryAdapter";
import { makeIdbAdapter, idbAvailable } from "./idbAdapter";

export async function pickStorage(): Promise<StorageAdapter> {
  if (await idbAvailable()) {
    return makeIdbAdapter();
  }
  console.warn(
    "[storage] IndexedDB unavailable — using in-memory store (notes won't persist this session).",
  );
  return makeMemoryAdapter();
}

export type { StorageAdapter } from "./types";
