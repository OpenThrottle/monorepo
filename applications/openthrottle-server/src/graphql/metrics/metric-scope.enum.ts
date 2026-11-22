/**
 * @description GraphQL enum naming what a metric group measures.
 */

import { registerEnumType } from '@nestjs/graphql';

export const MetricScope = {
  container: 'container',
  host: 'host',
  process: 'process',
} as const;

export type MetricScopeType = (typeof MetricScope)[keyof typeof MetricScope];

registerEnumType(MetricScope, {
  description: `What a metric group measures: host (the whole machine or VM — load average, os memory and /proc/pressure are host-wide under Docker), container (the server's own cgroup limits and usage) or process (the server process and the runs it tracks).`,
  name: 'MetricScope',
});
