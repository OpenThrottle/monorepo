/**
 * The search predicate {@link ChatCheckoutSelector} hands cmdk, replacing its
 * default fuzzy scoring.
 *
 * cmdk's `command-score` matches a query as a *subsequence*: the query's
 * characters only have to appear in order somewhere in the haystack. Combined
 * with the deliberately wide `checkoutSearchTerms` haystack — which includes
 * the filesystem path — that made every row match nearly every query: with
 * each checkout living under `/Users/matt/…`, `visormatt` subsequence-matches
 * `shiftsmartinc … /Users/matt/Development/…` just fine. The wide haystack is
 * the right call; the fuzzy scoring on top of it is what loses precision.
 */

/** No match — cmdk hides any item whose filter score is zero. */
const NO_MATCH = 0;
/** A token found anywhere inside a term. */
const CONTAINS_SCORE = 0.5;
/** A token a term starts with — a stronger signal, so it sorts first. */
const PREFIX_SCORE = 1;

/** The best score any one term yields for a token, or {@link NO_MATCH}. */
const scoreToken = (terms: readonly string[], token: string): number => {
  let best = NO_MATCH;

  for (const term of terms) {
    if (term.startsWith(token)) {
      return PREFIX_SCORE;
    }
    if (term.includes(token)) {
      best = CONTAINS_SCORE;
    }
  }

  return best;
};

/**
 * Strict, token-based substring matching over a checkout's search terms,
 * shaped to cmdk's `filter(value, search, keywords) => number` contract.
 *
 * The query is tokenized on whitespace; every token must substring-match at
 * least one term (AND across tokens, OR across terms), so `shiftsmartinc mono`
 * narrows to that org's `monorepo` while `visormatt` reaches only rows whose
 * owner, path or label genuinely contains it. Matching is case-insensitive and
 * ignores the `_value` cmdk passes — it is the checkout's UUID, and matching
 * it would let id fragments conjure ghost results.
 *
 * The returned score only ranks the survivors: tokens matched at a term's
 * start score higher than ones found mid-term, so a name hit outranks an
 * incidental path hit. A non-substring match is never rescued by ranking.
 *
 * @public
 */
export const checkoutSearchFilter = (
  _value: string,
  search: string,
  keywords?: readonly string[],
): number => {
  const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return PREFIX_SCORE;
  }

  const terms = (keywords ?? []).map((keyword) => keyword.toLowerCase());
  let total = 0;

  for (const token of tokens) {
    const score = scoreToken(terms, token);
    if (score === NO_MATCH) {
      return NO_MATCH;
    }
    total += score;
  }

  return total / tokens.length;
};
