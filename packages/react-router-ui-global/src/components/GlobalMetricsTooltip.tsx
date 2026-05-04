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
            <strong className="text-card-foreground">
              RSS / External (MB)
            </strong>{' '}
            – Main value is RSS (resident process memory). Sub-value is
            “external” memory outside the V8 heap (buffers, native addons).
            Under ~500MB RSS is typical in dev.
          </li>
          <li>
            <strong className="text-card-foreground">Heap (MB)</strong> – JS
            heap used vs total. Used near total may indicate memory pressure.
          </li>
          <li>
            <strong className="text-card-foreground">CPU (ms)</strong> –
            Cumulative user/system CPU time since process start. Rising steadily
            is normal; sudden jumps may indicate heavy work.
          </li>
          <li>
            <strong className="text-card-foreground">Chart</strong> – X axis is
            sample index (poll ticks); lines are RSS, heap used, and CPU user
            (see stroke colors).
          </li>
        </ul>
      </TooltipContent>
    </Tooltip>
  );
};
