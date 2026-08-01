import * as React from 'react';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import type { GetRootMetricsQuery } from '@openthrottle/openthrottle-developer-codegen';
import { formatCpuMs, formatMb } from '../utils/utils.global';

export interface GlobalMetricsStatCardsProps {
  readonly serverMetrics: GetRootMetricsQuery['serverMetrics'];
}

/**
 * @description The memory/CPU stat-card row of the `GlobalMetrics` panel.
 * Renders the latest sample only; the caller gates rendering on data being
 * present. Root keeps the `GlobalMetrics-data` test id from before extraction.
 */
export const GlobalMetricsStatCards = (
  props: GlobalMetricsStatCardsProps,
): React.ReactElement => {
  const { serverMetrics } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex flex-wrap gap-4 md:gap-8 lg:gap-12"
      data-testid="GlobalMetrics-data"
    >
      <OpenThrottleStatCard
        className="flex-1 bg-transparent p-4 md:p-8"
        subValue={formatMb(serverMetrics.externalMb)}
        title="RSS / External (MB)"
        value={formatMb(serverMetrics.rssMb)}
      />
      <OpenThrottleStatCard
        className="flex-1 bg-transparent p-4 md:p-8"
        subValue={formatMb(serverMetrics.heapTotalMb)}
        title="Heap (MB)"
        value={formatMb(serverMetrics.heapUsedMb)}
      />
      <OpenThrottleStatCard
        className="flex-1 bg-transparent p-4 md:p-8"
        subValue={formatCpuMs(serverMetrics.cpuSystemMs)}
        title="CPU (ms) user / system"
        value={formatCpuMs(serverMetrics.cpuUserMs)}
      />
    </div>
  );
};
