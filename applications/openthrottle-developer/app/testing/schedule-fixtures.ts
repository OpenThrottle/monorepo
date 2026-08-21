/**
 * @description Shared fixtures for the /schedule index specs: a schedule row, an in-flight run, the
 * run-stats aggregate, and the route's loader shape. Kept out of the spec files so each spec spells
 * out only the part it asserts on, and so a loader-shape change lands in one place.
 */

import type {
  ScheduledJobCardFragment,
  ScheduleInFlightRunFragment,
  ScheduleRunStatsFragment,
} from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/schedule._index';

export const scheduleJobFixture = (
  overrides: Partial<ScheduledJobCardFragment> = {},
): ScheduledJobCardFragment => ({
  __typename: 'ScheduledAgentJobObject',
  cronPattern: '0 9 * * *',
  driverId: 'claude',
  enabled: true,
  id: 'job-1',
  lastRunAt: null,
  model: 'opus',
  name: 'Nightly audit',
  nextRunAt: null,
  timezone: null,
  updatedAt: '2026-07-31T00:00:00.000Z',
  ...overrides,
});

export const scheduleInFlightRunFixture = (
  overrides: Partial<ScheduleInFlightRunFragment> = {},
): ScheduleInFlightRunFragment => ({
  __typename: 'ScheduledAgentJobRunObject',
  bullmqJobId: 'bull-1',
  cancelRequestedAt: null,
  driverId: 'claude',
  id: 'run-1',
  job: {
    __typename: 'ScheduledAgentJobObject',
    id: 'job-1',
    name: 'Nightly audit',
  },
  model: 'opus',
  scheduledAgentJobId: 'job-1',
  startedAt: '2026-07-31T00:00:00.000Z',
  status: 'running',
  trigger: 'schedule',
  ...overrides,
});

export const scheduleRunStatsFixture = (
  overrides: Partial<ScheduleRunStatsFragment> = {},
): ScheduleRunStatsFragment => ({
  __typename: 'ScheduledAgentJobRunStatsObject',
  cancelledCount: 0,
  failedCount: 0,
  inFlightCount: 0,
  noOpCount: 0,
  queuedCount: 0,
  runningCount: 0,
  since: '2026-07-30T00:00:00.000Z',
  succeededCount: 0,
  windowTotalCount: 0,
  ...overrides,
});

/**
 * @description The /schedule loader shape, defaulting to "nothing in flight" so a spec asserting on
 * the table or the onboarding path does not have to describe activity it does not care about.
 */
export const scheduleLoaderDataFixture = (
  overrides: Partial<Route.ComponentProps['loaderData']> = {},
): Route.ComponentProps['loaderData'] => ({
  inFlightByJob: {},
  inFlightRuns: [],
  jobs: [],
  runStats: scheduleRunStatsFixture(),
  search: '',
  ...overrides,
});
