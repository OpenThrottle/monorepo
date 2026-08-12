/**
 * @description Form-data parsers for the rollout (feature-flag) settings routes.
 */

/** Trimmed non-empty string, or null. */
export const optionalRolloutString = (
  value: FormDataEntryValue | null,
): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Native checkbox value → boolean (checked submits 'true' or 'on'). */
export const parseRolloutEnabled = (
  value: FormDataEntryValue | null,
): boolean => value === 'true' || value === 'on';

/** Comma-separated role names → trimmed, de-duped, non-empty list. */
export const parseRolloutTargetRoles = (
  value: FormDataEntryValue | null,
): string[] => {
  if (typeof value !== 'string') return [];
  const roles = value
    .split(',')
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
  return Array.from(new Set(roles));
};

/** Render a role-name list back into the comma-separated input value. */
export const formatRolloutTargetRoles = (roles: readonly string[]): string =>
  roles.join(', ');

/** Path to a rollout flag's detail page (`/settings/rollout/:flagId`). */
export const rolloutFlagDetailPath = (flagId: string): string =>
  `/settings/rollout/${flagId}`;
