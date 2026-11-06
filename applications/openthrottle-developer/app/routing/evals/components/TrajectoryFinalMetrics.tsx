import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import {
  TRAJECTORY_SUMMARY_COPY,
  TRAJECTORY_VIEWER_COPY,
} from '~/routing/evals/data/data.copy';
import type { AtifTrajectory } from '~/routing/evals/types';
import {
  formatTrajectoryCost,
  formatTrajectoryCount,
} from '~/routing/evals/utils/formatters';

export interface TrajectoryFinalMetricsProps {
  readonly className?: string;
  readonly finalMetrics: AtifTrajectory['final_metrics'];
}

/**
 * @description The document's `final_metrics`: prompt tokens (cached
 * included), completion tokens, cost and step count. A missing cost reads as
 * "unpriced", never `$0.00`.
 */
export const TrajectoryFinalMetrics = (
  props: TrajectoryFinalMetricsProps,
): React.ReactElement => {
  const { className, finalMetrics } = props;

  // Hooks

  // Setup
  const copy = TRAJECTORY_VIEWER_COPY;
  const cached = finalMetrics?.total_cached_tokens;
  const hasCached = cached != null && cached > 0;
  const cachedLabel = `${formatTrajectoryCount(cached)} ${TRAJECTORY_SUMMARY_COPY.cached}`;
  const promptSuffix = hasCached ? ` (${cachedLabel})` : '';
  const rows = [
    {
      label: copy.metricPrompt,
      value: `${formatTrajectoryCount(finalMetrics?.total_prompt_tokens)}${promptSuffix}`,
    },
    {
      label: copy.metricCompletion,
      value: formatTrajectoryCount(finalMetrics?.total_completion_tokens),
    },
    {
      label: copy.metricCost,
      value: formatTrajectoryCost(finalMetrics?.total_cost_usd),
    },
    {
      label: copy.metricSteps,
      value: formatTrajectoryCount(finalMetrics?.total_steps),
    },
  ];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby="trajectory-final-metrics"
      className={cn(
        'bg-card border-card-border rounded-lg border p-4',
        className,
      )}
      data-testid="TrajectoryFinalMetrics"
    >
      <h2 className="mb-3 text-sm font-medium" id="trajectory-final-metrics">
        {copy.finalMetricsHeading}
      </h2>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {rows.map((row) => {
          return (
            <div className="flex flex-col gap-0.5" key={row.label}>
              <dt className="text-muted-foreground text-xs">{row.label}</dt>
              <dd className="font-mono text-sm tabular-nums">{row.value}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
};
