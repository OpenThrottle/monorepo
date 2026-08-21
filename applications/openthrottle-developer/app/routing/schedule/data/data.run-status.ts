import type { BadgeProps } from '@openthrottle/react-router-shadcn';

/**
 * @description Badge variant per scheduled-job run status. Terminal-good (succeeded) and active
 * (running) read as `default`; `failed` is destructive; `cancelled` and `no_op` muted; `queued`
 * outlined. Unknown statuses fall back to `outline` at the call site.
 *
 * NOTE: `Badge`'s `variant` classes are currently all empty, so variant alone renders no visual
 * difference — {@link RUN_STATUS_COLOR} is what actually distinguishes the statuses on screen. This
 * map is kept because it carries the semantic intent and is what the styles will hang off if the
 * variant classes are filled in.
 */
export const RUN_STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  cancelled: 'secondary',
  failed: 'destructive',
  no_op: 'secondary',
  queued: 'outline',
  running: 'default',
  succeeded: 'default',
};

/**
 * @description Badge `color` per run status — the accent hue that makes each terminal state legible
 * at a glance in the run-history list, not just on the detail page.
 *
 * `no_op` is deliberately **amber, not red**: the run executed cleanly and nothing broke, but the
 * agent reported it did no work (see databases/migrations/095). Colouring it as an error would be as
 * misleading as the green it used to get; amber reads as "needs a look" without claiming a failure.
 *
 * Uses the `color` prop rather than `variant` because `Badge` documents these hues as the stable set
 * intended for categorical/status tagging, and because the `variant` classes are presently empty.
 */
export const RUN_STATUS_COLOR: Record<string, BadgeProps['color']> = {
  cancelled: 'slate',
  failed: 'red',
  no_op: 'amber',
  queued: 'slate',
  running: 'blue',
  succeeded: 'green',
};

/**
 * @description Human-readable label per run status. Only statuses whose stored value is not already
 * presentable need an entry; the raw status is the fallback at the call site.
 */
export const RUN_STATUS_LABEL: Record<string, string> = {
  no_op: 'no work done',
};

/**
 * @description Tailwind background class per run status, for the small status dot on the stats tiles.
 * Kept in the same file as {@link RUN_STATUS_COLOR} so the hue vocabulary has one home: a status that
 * reads blue on a badge reads blue on a tile. `OpenThrottleStatCard` takes a class rather than a
 * colour name, which is why this is a second map instead of a reuse of the badge one.
 */
export const RUN_STATUS_DOT_CLASS: Record<string, string> = {
  cancelled: 'bg-slate-300',
  failed: 'bg-red-300',
  no_op: 'bg-amber-300',
  queued: 'bg-slate-300',
  running: 'bg-blue-300',
  succeeded: 'bg-green-300',
};
