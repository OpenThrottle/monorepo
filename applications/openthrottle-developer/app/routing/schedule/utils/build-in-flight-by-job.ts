import type { ScheduleInFlightRunFragment } from '~/__generated__/graphql';

/**
 * @description Collapses the cross-job in-flight run list into a count per schedule id, so the
 * schedule table can answer "is this row busy" with one lookup instead of re-scanning the run list
 * for every row. Schedules with nothing in flight are simply absent from the map.
 */
export const buildInFlightByJob = (
  runs: ScheduleInFlightRunFragment[],
): Record<string, number> => {
  const byJob: Record<string, number> = {};

  for (const run of runs) {
    byJob[run.scheduledAgentJobId] = (byJob[run.scheduledAgentJobId] ?? 0) + 1;
  }

  return byJob;
};
