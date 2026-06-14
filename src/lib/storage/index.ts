/**
 * Storage entry point — the single place that decides WHERE notes live.
 *
 * Today (commit 6) it returns the in-memory adapter. Commit 7 swaps the body
 * for the IndexedDB adapter. A future OPFS / sqlite-wasm migration is likewise
 * just an edit here — the store and UI never change because they only ever see
 * the `StorageAdapter` interface.
 *
 *   // commit 7 will become roughly:
 *   // import { makeIdbAdapter } from "./idbAdapter";
 *   // export async function pickStorage() { return makeIdbAdapter(); }
 */
import type { StorageAdapter } from "./types";
import { makeMemoryAdapter } from "./memoryAdapter";

export async function pickStorage(): Promise<StorageAdapter> {
  return makeMemoryAdapter();
}

export type { StorageAdapter } from "./types";
