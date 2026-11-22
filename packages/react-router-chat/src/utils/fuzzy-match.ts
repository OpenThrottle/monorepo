const WORD_SEPARATORS = new Set(['-', '.', '/', '_', ' ']);

/** Score tiers, far enough apart that a lower tier can never outrank a higher one. */
const EXACT_SCORE = 1000;
const PREFIX_SCORE = 800;
const BOUNDARY_SCORE = 600;
const SUBSTRING_SCORE = 400;
const SUBSEQUENCE_SCORE = 200;
const SUBSEQUENCE_FLOOR = 100;
/** A basename hit outranks any hit that only lands in the directories. */
const BASENAME_BONUS = 2000;
/** Per-character tie-break so the shorter candidate wins within a tier. */
const LENGTH_PENALTY = 0.001;
/** Description matches only count at substring quality and always rank below slug matches. */
const SECONDARY_FACTOR = 0.1;

const isWordStart = (text: string, index: number): boolean => {
  if (index === 0) {
    return true;
  }
  const previous = text.charAt(index - 1);
  if (WORD_SEPARATORS.has(previous)) {
    return true;
  }
  const current = text.charAt(index);

  // camelCase hump: a lower-case letter or digit followed by an upper-case one.
  return (
    current !== current.toLowerCase() && previous === previous.toLowerCase()
  );
};

const hasWordStartOccurrence = (
  text: string,
  lowerText: string,
  lowerQuery: string,
): boolean => {
  let index = lowerText.indexOf(lowerQuery);
  while (index !== -1) {
    if (isWordStart(text, index)) {
      return true;
    }
    index = lowerText.indexOf(lowerQuery, index + 1);
  }

  return false;
};

/**
 * @description Subsequence score: `SUBSEQUENCE_SCORE` minus the characters
 * skipped between the first and last matched character (never below the floor),
 * or null when the query's characters do not appear in order.
 */
const scoreSubsequence = (
  lowerText: string,
  lowerQuery: string,
): number | null => {
  let queryIndex = 0;
  let first = -1;
  let last = -1;
  for (
    let textIndex = 0;
    textIndex < lowerText.length && queryIndex < lowerQuery.length;
    textIndex += 1
  ) {
    if (lowerText.charAt(textIndex) === lowerQuery.charAt(queryIndex)) {
      if (first === -1) {
        first = textIndex;
      }
      last = textIndex;
      queryIndex += 1;
    }
  }
  if (queryIndex < lowerQuery.length) {
    return null;
  }
  const gaps = last - first + 1 - lowerQuery.length;

  return Math.max(SUBSEQUENCE_SCORE - gaps, SUBSEQUENCE_FLOOR);
};

/**
 * @description Ranked, case-insensitive fuzzy score of `query` against `text`,
 * or null when it does not match. Higher is better. Tiers, best first: exact,
 * prefix, word-boundary start (after `/ - _ .` or a camelCase hump), contiguous
 * substring, scattered subsequence; a shorter `text` breaks ties within a tier.
 * An empty query matches everything with the same score.
 * @public
 */
export const fuzzyScore = (query: string, text: string): number | null => {
  const lowerQuery = query.trim().toLowerCase();
  if (lowerQuery === '') {
    return 0;
  }
  const lowerText = text.toLowerCase();
  const penalty = text.length * LENGTH_PENALTY;

  if (lowerText === lowerQuery) {
    return EXACT_SCORE - penalty;
  }
  if (lowerText.startsWith(lowerQuery)) {
    return PREFIX_SCORE - penalty;
  }
  if (!lowerText.includes(lowerQuery)) {
    const subsequence = scoreSubsequence(lowerText, lowerQuery);

    return subsequence === null ? null : subsequence - penalty;
  }
  if (hasWordStartOccurrence(text, lowerText, lowerQuery)) {
    return BOUNDARY_SCORE - penalty;
  }

  return SUBSTRING_SCORE - penalty;
};

/**
 * @description {@link fuzzyScore} for a file path: a match inside the basename
 * always outranks one that only matches across the directories.
 * @public
 */
export const fuzzyScorePath = (query: string, path: string): number | null => {
  const basename = path.slice(path.lastIndexOf('/') + 1);
  const basenameScore = fuzzyScore(query, basename);
  const pathPenalty = path.length * LENGTH_PENALTY;
  if (basenameScore !== null) {
    // Re-base the length tie-break on the whole path so siblings in deeper
    // folders rank behind shallower ones within the same basename tier.
    return (
      basenameScore +
      BASENAME_BONUS -
      pathPenalty +
      basename.length * LENGTH_PENALTY
    );
  }

  return fuzzyScore(query, path);
};

/**
 * @description Score a skill: the slug is matched at every tier; the
 * description only counts as a contiguous substring (never a scattered
 * subsequence) and always ranks below any slug match.
 * @public
 */
export const fuzzyScoreSkill = (
  query: string,
  skill: { readonly description: string; readonly slug: string },
): number | null => {
  const slugScore = fuzzyScore(query, skill.slug);
  if (slugScore !== null) {
    return slugScore;
  }
  const descriptionScore = fuzzyScore(query, skill.description);
  if (descriptionScore === null || descriptionScore < SUBSTRING_SCORE - 100) {
    return null;
  }

  return descriptionScore * SECONDARY_FACTOR;
};

/**
 * @description Filter to the items `scoreItem` matches and order them best
 * first; equal scores keep their input order. An empty query returns the items
 * unchanged. Pure and allocation-light enough for a few thousand candidates.
 * @public
 */
export const rankByFuzzyMatch = <T>(
  items: readonly T[],
  query: string,
  scoreItem: (query: string, item: T) => number | null,
): readonly T[] => {
  if (query.trim() === '') {
    return items;
  }
  const scored: {
    readonly index: number;
    readonly item: T;
    readonly score: number;
  }[] = [];
  items.forEach((item, index) => {
    const score = scoreItem(query, item);
    if (score !== null) {
      scored.push({ index, item, score });
    }
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.map((entry) => entry.item);
};
