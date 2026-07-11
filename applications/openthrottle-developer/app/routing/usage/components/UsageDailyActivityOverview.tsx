import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import {
  USAGE_COMPLETION_ATTRIBUTION_CAVEAT,
  USAGE_DAILY_STATS_SERIES,
} from '~/routing/usage/data/daily-stats-series-glossary';

export interface UsageDailyActivityOverviewProps {
  rangeDays: number;
}

/**
 * @description Explains what the Usage chart includes, defines each stacked series, and lists deliberate analytics gaps (prompt runs, tokens, local IDE skills).
 */
export const UsageDailyActivityOverview = (
  props: UsageDailyActivityOverviewProps,
): React.ReactElement => {
  const { rangeDays } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="border-none bg-transparent p-0">
      <GlobalHeading className="mb-4" title="What this chart includes" />
      <p className="text-muted-foreground mb-4 text-sm md:mb-8">
        Daily counts are aggregated in OpenThrottle for each calendar day over
        the last {rangeDays} days. They reflect OpenThrottle plan and task
        activity surfaced through the developer portal and automation—not
        IDE-only runs or model billing.
      </p>
      <p className="text-muted-foreground mb-4 text-xs md:mb-8">
        {USAGE_COMPLETION_ATTRIBUTION_CAVEAT}
      </p>

      <dl className="grid gap-4 text-sm md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {USAGE_DAILY_STATS_SERIES.map((row) => (
          <div
            className="min-w-0 opacity-50 transition-opacity hover:opacity-100"
            key={row.seriesKey}
          >
            <dt className="text-foreground mb-2 text-sm font-medium">
              {row.label}
            </dt>
            <dd className="text-muted-foreground text-xs">{row.description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
