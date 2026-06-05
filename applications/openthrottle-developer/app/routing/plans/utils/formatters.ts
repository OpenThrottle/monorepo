import { format, formatDistanceToNow } from 'date-fns';

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
    const parsed = JSON.parse(requirementsJson) as unknown;

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
    const parsed = JSON.parse(requirementsJson) as unknown;
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
  if (updatedAt == null) return null;

  const date = new Date(updatedAt as string);
  if (Number.isNaN(date.getTime())) return null;

  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * @description Formats an ISO date string for tooltip (short date and time).
 * Returns null if invalid.
 */
export function formatDateShort(value: unknown): string | null {
  if (value == null) return null;

  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return null;

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
