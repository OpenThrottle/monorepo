/**
 * How a {@link FuzzyMatchField} is compared against the query. `fuzzy` accepts
 * any in-order subsequence (`hcp` → `useHomeComposer`); `substring` requires the
 * query to appear contiguously, which keeps long prose fields (descriptions)
 * from matching nearly every short query.
 *
 * @public
 */
export type FuzzyMatchMode = 'fuzzy' | 'substring';

/**
 * One searchable text of an item, with the weight its score is multiplied by.
 *
 * @public
 */
export interface FuzzyMatchField {
  readonly mode: FuzzyMatchMode;
  readonly text: string;
  readonly weight: number;
}

/**
 * A path split for display: the file name is the label, the folder sits under it.
 *
 * @public
 */
export interface SplitFilePath {
  /** Folder portion without a trailing slash; `''` for a root-level file. */
  readonly folder: string;
  readonly name: string;
}

const SCORE_EXACT = 1000;
const SCORE_PREFIX = 800;
const SCORE_SUBSTRING = 600;
const SCORE_SUBSEQUENCE = 300;
const BONUS_BOUNDARY = 12;
const BONUS_CONSECUTIVE = 8;
const PENALTY_GAP = 1;
const BOUNDARY_CHARACTERS = new Set(['-', '.', '/', '_', ' ', ':']);

const isBoundary = (original: string, index: number): boolean => {
  if (index === 0) {
    return true;
  }
  const previous = original[index - 1] ?? '';
  const current = original[index] ?? '';
  if (BOUNDARY_CHARACTERS.has(previous)) {
    return true;
  }

  return (
    previous === previous.toLowerCase() &&
    current !== current.toLowerCase() &&
    current === current.toUpperCase()
  );
};

const scoreSubsequence = (query: string, original: string): number | null => {
  const target = original.toLowerCase();
  let score = SCORE_SUBSEQUENCE;
  let cursor = 0;
  let previousMatch = -2;

  for (const character of query) {
    const found = target.indexOf(character, cursor);
    if (found === -1) {
      return null;
    }
    if (found === previousMatch + 1) {
      score += BONUS_CONSECUTIVE;
    } else if (previousMatch >= 0) {
      score -= (found - previousMatch - 1) * PENALTY_GAP;
    }
    if (isBoundary(original, found)) {
      score += BONUS_BOUNDARY;
    }
    previousMatch = found;
    cursor = found + 1;
  }

  // Every subsequence still ranks below any contiguous substring match.
  return Math.min(Math.max(score, 1), SCORE_SUBSTRING - 1);
};

/**
 * Score how well `query` matches `target`, higher is better; `null` when it
 * does not match at all. Case-insensitive. Tiers, best first: exact, prefix,
 * substring (earlier and word-boundary hits rank higher), then — in `fuzzy`
 * mode — an in-order subsequence rewarded for consecutive runs and
 * word-boundary hits and penalised for gaps. An empty query matches everything
 * with score 0.
 *
 * @public
 */
export const scoreFuzzyMatch = (
  query: string,
  target: string,
  mode: FuzzyMatchMode = 'fuzzy',
): number | null => {
  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return 0;
  }
  const haystack = target.toLowerCase();
  if (haystack === needle) {
    return SCORE_EXACT;
  }
  if (haystack.startsWith(needle)) {
    return SCORE_PREFIX - Math.min(haystack.length - needle.length, 100);
  }
  const index = haystack.indexOf(needle);
  if (index !== -1) {
    const boundary = isBoundary(target, index) ? BONUS_BOUNDARY * 4 : 0;
    return SCORE_SUBSTRING - Math.min(index, 100) + boundary;
  }

  return mode === 'fuzzy' ? scoreSubsequence(needle, target) : null;
};

/**
 * Filter `items` to those matching `query` and order them best match first.
 * An item's score is its best weighted field score. Ties keep the input order
 * (the sort is stable), so callers control the tie-break by pre-sorting. An
 * empty query returns the input unchanged. `limit` caps the result.
 *
 * @public
 */
export const rankFuzzyMatches = <TItem>(
  items: readonly TItem[],
  query: string,
  fields: (item: TItem) => readonly FuzzyMatchField[],
  limit: number = Number.POSITIVE_INFINITY,
): readonly TItem[] => {
  if (query.trim() === '') {
    return items.slice(0, limit);
  }

  const scored: { readonly item: TItem; readonly score: number }[] = [];
  for (const item of items) {
    let best: number | null = null;
    for (const field of fields(item)) {
      const score = scoreFuzzyMatch(query, field.text, field.mode);
      if (score !== null && (best === null || score * field.weight > best)) {
        best = score * field.weight;
      }
    }
    if (best !== null) {
      scored.push({ item, score: best });
    }
  }

  return scored
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.item);
};

/**
 * Split a POSIX workspace-relative path into its file name and folder.
 *
 * @public
 */
export const splitFilePath = (path: string): SplitFilePath => {
  const slash = path.lastIndexOf('/');
  if (slash === -1) {
    return { folder: '', name: path };
  }

  return { folder: path.slice(0, slash), name: path.slice(slash + 1) };
};

/**
 * Rank workspace-relative file paths for the `@`-mention menu: a hit on the
 * file name outranks the same hit elsewhere in the path, and among equal
 * scores shorter paths come first.
 *
 * @public
 */
export const rankFilePaths = (
  paths: readonly string[],
  query: string,
  limit: number = Number.POSITIVE_INFINITY,
): readonly string[] => {
  if (query.trim() === '') {
    return paths.slice(0, limit);
  }
  const byLength = [...paths].sort((left, right) => left.length - right.length);

  return rankFuzzyMatches(
    byLength,
    query,
    (path) => [
      { mode: 'fuzzy', text: splitFilePath(path).name, weight: 1.5 },
      { mode: 'fuzzy', text: path, weight: 1 },
    ],
    limit,
  );
};
