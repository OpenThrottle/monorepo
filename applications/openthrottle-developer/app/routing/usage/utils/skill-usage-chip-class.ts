/**
 * @description Class builder for the Usage-route skill-usage filter chips,
 * shared so active/inactive chip styling stays consistent across filter groups.
 */

import clsx from 'clsx';

/** Filter-chip classes, toggling the active (selected) treatment. */
export const skillUsageChipClass = (active: boolean): string =>
  clsx(
    'rounded-full border px-3 py-1 text-xs transition-colors',
    active
      ? 'border-primary bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:text-foreground border-border',
  );
