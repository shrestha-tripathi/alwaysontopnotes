/**
 * Note search — naive ranked substring over the lightweight index.
 *
 * For < 1000 notes this runs in well under one frame (16 ms), so no search
 * library is warranted (SPEC §5). The interface is `search(index, query)` so
 * if a user ever hits 5k+ notes we can drop in MiniSearch behind the same
 * signature without touching callers.
 *
 * Ranking (higher = better):
 *   - title match  > preview match
 *   - earlier match position scores higher (prefix beats deep substring)
 *   - pinned notes get a small tiebreak bump
 * Zero score = filtered out.
 */
import type { NoteIndexEntry } from "./types";

function rank(entry: NoteIndexEntry, needle: string): number {
  const title = entry.title.toLowerCase();
  const preview = entry.preview.toLowerCase();

  const tIdx = title.indexOf(needle);
  const pIdx = preview.indexOf(needle);
  if (tIdx === -1 && pIdx === -1) return 0;

  let score = 0;
  if (tIdx !== -1) {
    // Title hits dominate; earlier = better; exact prefix is best.
    score += 1000 - Math.min(tIdx, 100) * 5;
    if (tIdx === 0) score += 200;
  }
  if (pIdx !== -1) {
    score += 300 - Math.min(pIdx, 100) * 2;
  }
  if (entry.pinned) score += 10;
  return score;
}

export function searchNotes(
  index: NoteIndexEntry[],
  query: string,
): NoteIndexEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return index;
  return index
    .map((entry) => ({ entry, score: rank(entry, needle) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.entry);
}
