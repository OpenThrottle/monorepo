import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { USAGE_DAILY_STATS_SERIES } from '~/routing/usage/data/daily-stats-series-glossary';

export interface UsageDailyActivityOverviewProps {
  readonly rangeDays: number;
}

/**
 * @description Explains what the Usage chart includes, defines each stacked series, and lists deliberate analytics gaps (prompt runs, tokens, local IDE skills).
 */
export function UsageDailyActivityOverview(
  props: UsageDailyActivityOverviewProps,
): React.ReactElement {
  const { rangeDays } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="bg-transparent p-0 border-none">
      <GlobalHeading className="mb-4" title="What this chart includes" />
      <p className="text-muted-foreground text-sm mb-4 md:mb-8">
        Daily counts are aggregated in OpenThrottle for each calendar day over
        the last {rangeDays} days. They reflect Cortex plan and task activity
        surfaced through the developer portal and automation—not IDE-only runs
        or model billing.
      </p>

      <dl className="grid gap-4 md:gap-8 text-sm md:grid-cols-2 lg:grid-cols-3">
        {USAGE_DAILY_STATS_SERIES.map((row) => (
          <div className="min-w-0" key={row.seriesKey}>
            <dt className="font-medium text-foreground text-sm mb-2">
              {row.label}
            </dt>
            <dd className="text-muted-foreground text-xs">{row.description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
