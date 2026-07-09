import { format, formatDistanceToNow } from 'date-fns';

/**
 * @description Coerces an unknown value the `Date` constructor accepts
 * (string / number / Date) into a valid Date, or null when the value is not a
 * date-like input or parses to an invalid date.
 */
function toValidDate(value: unknown): Date | null {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    !(value instanceof Date)
  ) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @description Parses requirementsJson and returns the number of requirements.
 * Returns 0 if invalid or empty.
 */
export function getRequirementsCount(
  requirementsJson: string | null | undefined,
): number {
  if (requirementsJson == null || requirementsJson === '') {
    return 0;
  }

  try {
    const parsed: unknown = JSON.parse(requirementsJson);

    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

/**
 * @description Parses requirementsJson and returns an array of requirement
 * labels (strings). Returns [] if invalid or not an array.
 */
export function parseRequirementsList(
  requirementsJson: string | null | undefined,
): readonly string[] {
  if (requirementsJson == null || requirementsJson === '') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(requirementsJson);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

/**
 * @description Formats an ISO date string as relative time (e.g. "2 days ago").
 * Returns null if invalid.
 */
export function formatUpdatedAt(updatedAt: unknown): string | null {
  const date = toValidDate(updatedAt);
  if (date === null) return null;

  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * @description Formats an ISO date string for tooltip (short date and time).
 * Returns null if invalid.
 */
export function formatDateShort(value: unknown): string | null {
  const date = toValidDate(value);
  if (date === null) return null;

  return format(date, 'MMM d, yyyy h:mm a');
}

/**
 * @description Formats plan date (createdAt/updatedAt) for display;
 * returns "—" if invalid.
 */
export function formatPlanDate(value: string | number | unknown): string {
  if (value == null) return '—';

  const isNumber = typeof value === 'number';
  const date = isNumber ? new Date(value) : new Date(String(value));

  return date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  // return Number.isNaN(date.getTime())
  // ? '—'
  // : format(date, 'MMM d, yyyy h:mm a', {});
}
