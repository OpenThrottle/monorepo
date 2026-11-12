import { formatDate } from 'date-fns';

/**
 * @description `MMM d, yyyy` label for a date, or `null` when the value is
 * absent (so callers can skip the row instead of formatting nothing).
 */
export const formatOptionalDate = (
  value: Parameters<typeof formatDate>[0] | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }

  return formatDate(value, 'MMM d, yyyy');
};
