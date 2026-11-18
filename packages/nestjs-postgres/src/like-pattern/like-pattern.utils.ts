/**
 * @description Escaping for user-supplied text that feeds a SQL `LIKE`/`ILIKE`
 * pattern. TypeORM parameterizes the *value*, which stops injection but not
 * wildcards: a branch named `feat/100%_done` would otherwise match anything.
 * Callers escape the raw input first, then wrap it in their own `%` anchors.
 */

/** Escape character paired with every escaped pattern (`ESCAPE '\'`). */
const LIKE_ESCAPE_CHARACTER = '\\';

/** Characters that carry pattern meaning inside a LIKE/ILIKE expression. */
const LIKE_METACHARACTERS = /[\\%_]/g;

/**
 * @description Escapes `\`, `%`, and `_` in `value` so it matches literally
 * inside a `LIKE`/`ILIKE` pattern. Postgres treats `\` as the default escape
 * character, so no explicit `ESCAPE` clause is required.
 * @public
 */
export const escapeLikePattern = (value: string): string => {
  return value.replace(
    LIKE_METACHARACTERS,
    (match) => `${LIKE_ESCAPE_CHARACTER}${match}`,
  );
};

/**
 * @description Escapes `value` and wraps it in `%` anchors, producing a
 * case-insensitive substring pattern for `ILIKE`.
 * @public
 */
export const toLikeContainsPattern = (value: string): string => {
  return `%${escapeLikePattern(value)}%`;
};
