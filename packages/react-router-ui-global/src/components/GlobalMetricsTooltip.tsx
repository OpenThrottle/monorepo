import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Info } from 'lucide-react';
import { GLOBAL_METRICS_STAT_CARD_DOCS } from '../config';

export interface GlobalMetricsTooltipProps {
  readonly className?: string;
  /**
   * @description Optional deep link to a persistent definitions panel (e.g. Settings → Debug).
   */
  readonly definitionsHref?: string;
}

export const GlobalMetricsTooltip = (
  props: GlobalMetricsTooltipProps,
): React.ReactElement => {
  const { definitionsHref } = props;

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
          {GLOBAL_METRICS_STAT_CARD_DOCS.map((doc) => (
            <li key={doc.title}>
              <strong className="text-card-foreground">{doc.title}</strong> —{' '}
              {doc.body}
            </li>
          ))}
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
        {definitionsHref ? (
          <p className="mt-3 border-t border-border pt-3 text-xs font-normal leading-snug">
            <a
              className="font-medium text-primary underline underline-offset-2"
              href={definitionsHref}
            >
              Open full definitions in Settings
            </a>{' '}
            (stable reference for support tickets).
          </p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
};
