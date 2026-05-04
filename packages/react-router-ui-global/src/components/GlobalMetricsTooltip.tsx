import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Info } from 'lucide-react';

export interface GlobalMetricsTooltipProps {
  readonly className?: string;
}

export const GlobalMetricsTooltip = (
  _props: GlobalMetricsTooltipProps,
): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <button
          aria-label="Metrics interpretation help"
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid="GlobalMetrics-info-trigger"
          type="button"
        >
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        className="max-w-sm text-sm p-4 text-muted-foreground"
        data-testid="GlobalMetrics-info-tooltip"
        side="right"
      >
        <p className="font-semibold text-base mb-3 text-card-foreground">
          What you are looking at
        </p>
        <p className="mb-3 font-normal leading-snug">
          Each poll calls the{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-foreground">
            serverMetrics
          </code>{' '}
          field on{' '}
          <strong className="text-card-foreground">openthrottle-server</strong>{' '}
          via GraphQL. Numbers describe the API process on the server, not RAM
          or CPU for this browser tab.
        </p>
        <p className="font-semibold text-sm mb-2 text-card-foreground">
          Stat cards
        </p>
        <ul className="list-disc font-normal pl-4 space-y-2 mb-3">
          <li>
            <strong className="text-card-foreground">
              RSS / External (MB)
            </strong>{' '}
            — Large number: RSS (resident set size), total process memory the OS
            tracks for the Node process. Sub-value: “external” bytes outside the
            V8 heap (buffers, native addons). Useful for overall footprint; ~low
            hundreds of MB is common in local dev.
          </li>
          <li>
            <strong className="text-card-foreground">Heap (MB)</strong> — Large
            number: V8 heap currently used. Sub-value: heap limit / total
            allocated for JS objects. When used persistently nears total, expect
            GC pressure or risk of allocation failures.
          </li>
          <li>
            <strong className="text-card-foreground">
              CPU user / system (ms)
            </strong>{' '}
            — Cumulative CPU milliseconds since the server process started (not
            per request). User time is JS/work in process context; system time
            is kernel work on behalf of the process. Both increase over time;
            abrupt spikes while idle may mean heavy background work. The trend
            chart plots <em>user</em> ms only so the Y axis stays comparable to
            memory lines.
          </li>
        </ul>
        <p className="font-semibold text-sm mb-2 text-card-foreground">
          Poll & chart
        </p>
        <ul className="list-disc font-normal pl-4 space-y-2">
          <li>
            <strong className="text-card-foreground">Poll interval</strong> —
            How often the browser refetches metrics after the first load.{' '}
            <strong className="text-card-foreground">Off</strong> keeps the last
            fetch only (no timer).
          </li>
          <li>
            <strong className="text-card-foreground">Metrics over time</strong>{' '}
            — X axis is sample index (order of polls in this tab session).
            Lines: RSS (MB), heap used (MB), CPU user (ms); colors match the
            legend under the chart.
          </li>
        </ul>
      </TooltipContent>
    </Tooltip>
  );
};
