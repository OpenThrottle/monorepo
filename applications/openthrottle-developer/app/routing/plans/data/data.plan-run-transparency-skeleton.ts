interface PlanRunTransparencySkeletonColumn {
  /** Hidden below `sm`, like the real table's Model / backend and Branch / PR columns. */
  readonly hiddenOnNarrow: boolean;
  readonly key: string;
  readonly widthClassName: string;
}

/**
 * @description Placeholder columns of one run history skeleton row, in the real table's order
 * (When, Status, Model / backend, Branch / PR); the chevron and actions columns are drawn inline.
 */
export const PLAN_RUN_TRANSPARENCY_SKELETON_HISTORY_COLUMNS: readonly PlanRunTransparencySkeletonColumn[] =
  [
    { hiddenOnNarrow: false, key: 'when', widthClassName: 'w-24' },
    { hiddenOnNarrow: false, key: 'status', widthClassName: 'w-20' },
    { hiddenOnNarrow: true, key: 'model', widthClassName: 'w-28' },
    { hiddenOnNarrow: true, key: 'branch', widthClassName: 'w-32' },
  ];

/** @description Keys for the run history skeleton body rows (about half the initial page). */
export const PLAN_RUN_TRANSPARENCY_SKELETON_HISTORY_ROWS: readonly number[] = [
  0, 1, 2, 3, 4,
];
