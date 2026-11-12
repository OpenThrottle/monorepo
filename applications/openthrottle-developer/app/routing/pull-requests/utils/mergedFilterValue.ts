/** Form value for the "Merged" select: `true`, `false`, or `''` for any. */
export const mergedFilterValue = (
  merged: boolean | null | undefined,
): string => {
  if (merged === true) {
    return 'true';
  }

  if (merged === false) {
    return 'false';
  }

  return '';
};
