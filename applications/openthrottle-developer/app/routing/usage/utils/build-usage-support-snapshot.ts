import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

export interface BuildUsageSupportSnapshotInput {
  readonly dailyStats: ReadonlyArray<DashboardDailyStatsCardFragment>;
  readonly rangeDays: number;
  readonly rangeEndIso: string;
  readonly rangeStartIso: string;
}

const emptyTotals = {
  plansCompleted: 0,
  plansCreated: 0,
  plansUpdated: 0,
  tasksCompleted: 0,
  tasksCreated: 0,
  tasksUpdated: 0,
} as const;

/**
 * @description JSON bundle for support: date range, per-day rows, and series totals. Does not add new metrics—makes existing rollups copy-pasteable.
 */
export const buildUsageSupportSnapshotJson = (
  input: BuildUsageSupportSnapshotInput,
): string => {
  const totals = input.dailyStats.reduce(
    (acc, row) => ({
      plansCompleted: acc.plansCompleted + row.plansCompleted,
      plansCreated: acc.plansCreated + row.plansCreated,
      plansUpdated: acc.plansUpdated + row.plansUpdated,
      tasksCompleted: acc.tasksCompleted + row.tasksCompleted,
      tasksCreated: acc.tasksCreated + row.tasksCreated,
      tasksUpdated: acc.tasksUpdated + row.tasksUpdated,
    }),
    { ...emptyTotals },
  );

  return JSON.stringify(
    {
      analyticsNote:
        'OpenThrottle daily plan/task rollups only. Excludes model tokens, per-prompt or per-skill counts, and IDE-only activity.',
      dailyRows: input.dailyStats,
      generatedAt: new Date().toISOString(),
      rangeDays: input.rangeDays,
      rangeEnd: input.rangeEndIso,
      rangeStart: input.rangeStartIso,
      totals,
    },
    null,
    2,
  );
};
