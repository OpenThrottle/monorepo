/**
 * @description GraphQL enum naming what a metric group measures.
 */

import { registerEnumType } from '@nestjs/graphql';

export const METRIC_SCOPE = {
  container: 'container',
  host: 'host',
  process: 'process',
} as const;

export type MetricScopeKey = keyof typeof METRIC_SCOPE;
export type MetricScopeValue = (typeof METRIC_SCOPE)[MetricScopeKey];

registerEnumType(METRIC_SCOPE, {
  description: `What a metric group measures: host (the whole machine or VM — load average, os memory and /proc/pressure are host-wide under Docker), container (the server's own cgroup limits and usage) or process (the server process and the runs it tracks).`,
  name: 'MetricScope',
});
