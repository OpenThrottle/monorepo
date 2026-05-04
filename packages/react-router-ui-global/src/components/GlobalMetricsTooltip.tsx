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
        className="max-w-xs text-sm p-4 text-muted-foreground"
        data-testid="GlobalMetrics-info-tooltip"
        side="right"
      >
        <p className="font-semibold text-base mb-4">
          Understanding these metrics:
        </p>
        <ul className="list-disc font-normal pl-4 space-y-1">
          <li>
            <strong className="text-card-foreground">RSS</strong> – Total
            process memory including shared libraries. Under 500MB is typical.
          </li>
          <li>
            <strong className="text-card-foreground">Heap</strong> – JS heap
            memory (used / total). Used near total may indicate memory pressure.
          </li>
          <li>
            <strong className="text-card-foreground">CPU</strong> – Cumulative
            user/system CPU time since process start. Rising steadily is normal;
            sudden jumps may indicate heavy computation.
          </li>
        </ul>
      </TooltipContent>
    </Tooltip>
  );
};
