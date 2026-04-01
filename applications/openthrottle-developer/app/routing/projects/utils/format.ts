/**
 * @description Formats a project date value for display; returns em dash for null/undefined or invalid dates.
 */
export function formatProjectDate(value: string | number | unknown): string {
  if (value == null) return '—';

  const isNumber = typeof value === 'number';
  const date = isNumber ? new Date(value) : new Date(String(value));

  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}
