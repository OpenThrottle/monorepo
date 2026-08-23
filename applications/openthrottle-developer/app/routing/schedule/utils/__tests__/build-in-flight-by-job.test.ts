import { describe, expect, it } from 'vitest';
import { buildInFlightByJob } from '~/routing/schedule/utils/build-in-flight-by-job';
import type { ScheduleInFlightRunFragment } from '~/__generated__/graphql';

const run = (
  id: string,
  scheduledAgentJobId: string,
): ScheduleInFlightRunFragment => ({
  bullmqJobId: id,
  cancelRequestedAt: null,
  driverId: 'claude',
  id,
  job: { id: scheduledAgentJobId, name: `schedule ${scheduledAgentJobId}` },
  model: null,
  scheduledAgentJobId,
  startedAt: null,
  status: 'running',
  trigger: 'schedule',
});

describe('buildInFlightByJob', () => {
  it('returns an empty map for no runs', () => {
    expect(buildInFlightByJob([])).toEqual({});
  });

  it('counts one run per schedule', () => {
    expect(
      buildInFlightByJob([run('run-1', 'job-1'), run('run-2', 'job-2')]),
    ).toEqual({ 'job-1': 1, 'job-2': 1 });
  });

  it('accumulates multiple concurrent runs of the same schedule', () => {
    expect(
      buildInFlightByJob([
        run('run-1', 'job-1'),
        run('run-2', 'job-1'),
        run('run-3', 'job-1'),
      ]),
    ).toEqual({ 'job-1': 3 });
  });

  it('keeps runs for schedules absent from the filtered list — the table just never looks them up', () => {
    const byJob = buildInFlightByJob([run('run-1', 'filtered-out-job')]);
    expect(byJob['filtered-out-job']).toBe(1);
    expect(byJob['job-on-screen']).toBeUndefined();
  });
});
