interface SortablePlanRun {
  readonly scheduledFor?: string | null;
  readonly status: string;
}

const fireTime = (row: SortablePlanRun): number => {
  const time = new Date(row.scheduledFor ?? '').getTime();

  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

/**
 * @description Orders the run audit table, which is newest-created-first. A pending SCHEDULED run
 * is the one row whose interesting timestamp is in the future (`scheduledFor`, up to 30 days out),
 * so by `createdAt` it would sink below every run created since and, with the history query capped
 * at 10 rows, can fall out of the list entirely — taking its Cancel action with it. Pending
 * SCHEDULED rows are therefore pinned to the top, soonest fire time first (a missing or
 * unparseable `scheduledFor` sorts last among them). Every other row keeps the incoming
 * (`createdAt` descending) order: the sort is stable, and a MISSED / SUPERSEDED / fired run is
 * history again and belongs where it was created. Returns a new array.
 */
export const sortPlanRunAuditRows = <TRow extends SortablePlanRun>(
  rows: readonly TRow[],
): TRow[] => {
  const scheduled = rows
    .filter((row) => row.status === 'SCHEDULED')
    .sort((left, right) => fireTime(left) - fireTime(right));
  const others = rows.filter((row) => row.status !== 'SCHEDULED');

  return [...scheduled, ...others];
};
