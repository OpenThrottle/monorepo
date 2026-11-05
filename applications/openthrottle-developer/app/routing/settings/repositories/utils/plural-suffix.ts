/**
 * @description Picks the singular or plural copy for a count: exactly one gets
 * `one`, everything else (zero included) gets `other`.
 */
export const pluralSuffix = (
  count: number,
  one: string,
  other: string,
): string => {
  if (count === 1) {
    return one;
  }

  return other;
};
