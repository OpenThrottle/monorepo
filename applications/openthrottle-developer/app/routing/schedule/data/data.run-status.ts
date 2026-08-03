import type { BadgeProps } from '@openthrottle/react-router-shadcn';

/**
 * @description Badge variant per scheduled-job run status. Terminal-good (succeeded) and active
 * (running) read as `default`; `failed` is destructive; `cancelled` muted; `queued` outlined.
 * Unknown statuses fall back to `outline` at the call site.
 */
export const RUN_STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  cancelled: 'secondary',
  failed: 'destructive',
  queued: 'outline',
  running: 'default',
  succeeded: 'default',
};
