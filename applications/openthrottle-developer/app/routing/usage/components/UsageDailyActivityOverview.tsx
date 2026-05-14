import * as React from 'react';
import { Link } from 'react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
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

  return (
    <div className="space-y-6">
      <Card className="bg-transparent">
        <CardHeader>
          <CardTitle className="text-base">What this chart includes</CardTitle>
          <CardDescription>
            Daily counts are aggregated in OpenThrottle for each calendar day
            over the last {rangeDays} days. They reflect Cortex plan and task
            activity surfaced through the developer portal and automation—not
            IDE-only runs or model billing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {USAGE_DAILY_STATS_SERIES.map((row) => (
              <div className="min-w-0" key={row.seriesKey}>
                <dt className="font-medium text-foreground">{row.label}</dt>
                <dd className="text-muted-foreground">{row.description}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">
            Analytics gaps (by design today)
          </CardTitle>
          <CardDescription>
            Use other surfaces when you need finer-grained debugging—the Usage
            chart is a coarse workload signal only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li>No per-prompt, per-skill, or per-command invocation counts.</li>
            <li>No model token, cost, or latency metrics.</li>
            <li>
              No visibility into user-local skills under{' '}
              <code className="text-xs">~/.cursor/skills-cursor</code> (not
              in-repo).
            </li>
            <li>
              For prompt identity and version drift, open a prompt and expand{' '}
              <span className="text-foreground">
                Prompt versioning &amp; debug
              </span>{' '}
              (relative timestamps and content fingerprints), or jump from{' '}
              <Link className="text-primary underline" to="/prompts">
                Prompts
              </Link>
              .
            </li>
            <li>
              Use{' '}
              <span className="text-foreground">
                Copy usage snapshot (JSON)
              </span>{' '}
              above to attach the same daily rows and totals to a ticket—still
              no per-prompt metrics, but easier than screenshots.
            </li>
            <li>
              For in-repo skill paths, see{' '}
              <Link className="text-primary underline" to="/skills">
                Skills
              </Link>{' '}
              (<code className="text-xs">.agents/skills</code> vs{' '}
              <code className="text-xs">.cursor/skills</code>).
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
