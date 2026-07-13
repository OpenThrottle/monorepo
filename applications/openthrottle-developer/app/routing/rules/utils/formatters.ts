/**
 * A example formatter...
 * Build what we need and add them in here as simple testable functions.
 */
export const formatRulesDate = (date: string): string => {
  return new Date(date).toLocaleString();
};
