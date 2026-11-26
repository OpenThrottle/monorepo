/** Kind of a line in a unified patch. */
export type DiffLineKind = 'add' | 'context' | 'hunk' | 'meta' | 'remove';

/** Theme-token classes for each diff line kind (no raw colors). */
export const DIFF_LINE_TONES = {
  add: 'bg-success/10 text-success',
  context: 'text-foreground',
  hunk: 'bg-muted text-muted-foreground',
  meta: 'text-muted-foreground',
  remove: 'bg-destructive/10 text-destructive',
} as const satisfies Record<DiffLineKind, string>;

/** Shown when a patch has no lines. */
export const DIFF_VIEW_EMPTY_LABEL = 'No changes to show.';
