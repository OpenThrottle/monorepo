import { format } from 'date-fns';

/**
 * @description Formats a task date (createdAt/updatedAt) for display; returns
 * "—" if invalid.
 */
export const formatTaskDate = (value: string | number | unknown): string => {
  if (value == null) return '—';

  const isNumber = typeof value === 'number';
  const date = isNumber ? new Date(value) : new Date(String(value));

  return Number.isNaN(date.getTime())
    ? '—'
    : format(date, 'MMM d, yyyy h:mm a');
};
