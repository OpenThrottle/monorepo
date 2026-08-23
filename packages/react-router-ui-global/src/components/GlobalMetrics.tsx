import * as React from 'react';
import clsx from 'clsx';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { ChevronDownIcon } from 'lucide-react';
import { GLOBAL_METRICS_POLL_INTERVAL_PRESETS } from '../config';
import { formatMetricsSummary } from '../utils/utils.global';
import { useGlobalMetrics } from '../hooks/useGlobalMetrics';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { GlobalMetricsInfoModal } from './GlobalMetricsInfoModal';
import { GlobalMetricsInfoTrigger } from './GlobalMetricsInfoTrigger';
import { GlobalMetricsStatCards } from './GlobalMetricsStatCards';

/**
 * `recharts` is ~350 KB of client JS and the chart only renders once the panel
 * is expanded *and* has samples — but a static import put it in the root
 * shell's graph, so every route paid for it. Deferring it here keeps the
 * collapsed panel (the default) free of charting code.
 */
const GlobalMetricsChartLazy = React.lazy(async () => {
  const chartModule = await import('./GlobalMetricsChart');

  return { default: chartModule.GlobalMetricsChart };
});

export interface GlobalMetricsProps {
  readonly className?: string;
  /** Whether the metrics panel should be open by default. */
  readonly defaultOpen?: boolean;
  /** Deep link to a persistent metric-definitions panel (e.g. Settings → Debug → Server metrics definitions). */
  readonly definitionsHref?: string;
  /** In-app link for GraphQL connectivity troubleshooting (e.g. Settings → Debug in openthrottle-developer). */
  readonly diagnosticsHref?: string;
  readonly pollIntervalMs?: number;
  /** When true, show a collapsed “Sampling & endpoint” block with poll interval, sample count, and GraphQL URL (for support / debugging). */
  readonly showSamplingDetails?: boolean;
}

export const GlobalMetrics = (
  props: GlobalMetricsProps,
): React.ReactElement => {
  const {
    className,
    defaultOpen = true,
    definitionsHref,
    diagnosticsHref: _diagnosticsHref = '/settings/debug',
    pollIntervalMs: propPollIntervalMs,
    showSamplingDetails: _showSamplingDetails = true,
  } = props;

  // Hooks
  const prefersReducedMotion = usePrefersReducedMotion();
  const {
    chartLineData,
    error,
    handleIntervalChange,
    handleOpenChange,
    intervalMs,
    isOpen,
    serverMetrics,
    showGlobalLoadingBanner,
    showMetricsChart,
    showStatCards,
  } = useGlobalMetrics({ defaultOpen, pollIntervalMs: propPollIntervalMs });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex w-full flex-col', 'p-4 md:p-8 lg:p-12', className)}
      data-testid="GlobalMetrics"
    >
      <Collapsible onOpenChange={handleOpenChange} open={isOpen}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex w-full min-w-0 items-center gap-2">
              <CollapsibleTrigger asChild={true}>
                <Button
                  aria-label={
                    isOpen ? 'Collapse server metrics' : 'Expand server metrics'
                  }
                  className="text-muted-foreground hover:text-foreground size-7 shrink-0"
                  data-testid="GlobalMetrics-toggle"
                  size="icon"
                  variant="ghost"
                >
                  <ChevronDownIcon
                    aria-hidden={true}
                    className={clsx('size-4', {
                      'rotate-180': isOpen,
                      'transition-transform duration-300':
                        !prefersReducedMotion,
                    })}
                  />
                </Button>
              </CollapsibleTrigger>
              <h2 className="text-muted-foreground shrink-0">Server metrics</h2>
              <GlobalMetricsInfoTrigger />
              <div className="flex-1" />
              <span
                aria-hidden={isOpen}
                className={clsx(
                  'text-muted-foreground truncate text-sm tabular-nums',
                  {
                    'max-w-0 overflow-hidden opacity-0': isOpen,
                    'max-w-[60ch] opacity-100': !isOpen,
                    'transition-all duration-300': !prefersReducedMotion,
                  },
                )}
                data-testid="GlobalMetrics-summary"
              >
                {formatMetricsSummary(serverMetrics)}
              </span>

              {isOpen && (
                <Label
                  aria-hidden={!isOpen}
                  className={clsx('flex shrink-0 items-center gap-2', {
                    'opacity-100': isOpen,
                    'pointer-events-none opacity-0': !isOpen,
                    'transition-opacity duration-200': !prefersReducedMotion,
                  })}
                >
                  <span>Poll</span>
                  <Select
                    aria-label="Metrics poll interval"
                    onValueChange={handleIntervalChange}
                    value={intervalMs.toString()}
                  >
                    <SelectTrigger
                      className="w-[80px]"
                      data-testid="GlobalMetrics-poll-interval"
                      tabIndex={isOpen ? undefined : -1}
                    >
                      <SelectValue placeholder="Poll interval…" />
                    </SelectTrigger>
                    <SelectContent>
                      {GLOBAL_METRICS_POLL_INTERVAL_PRESETS.map((preset) => (
                        <SelectItem
                          key={preset.valueMs}
                          value={preset.valueMs.toString()}
                        >
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Label>
              )}
            </div>
          </div>

          <GlobalMetricsInfoModal definitionsHref={definitionsHref} />

          {showGlobalLoadingBanner && (
            <p data-testid="GlobalMetrics-loading">Loading…</p>
          )}

          {error != null && (
            <p data-testid="GlobalMetrics-error" role="alert">
              {error.message}
            </p>
          )}

          <CollapsibleContent
            className={clsx('overflow-hidden', {
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-300':
                !prefersReducedMotion,
            })}
          >
            <div className="flex w-full flex-col gap-4 pt-4 md:gap-8 md:pt-8 lg:gap-12">
              {showStatCards && serverMetrics != null && (
                <GlobalMetricsStatCards serverMetrics={serverMetrics} />
              )}

              {showMetricsChart && (
                <React.Suspense fallback={null}>
                  <GlobalMetricsChartLazy data={chartLineData} />
                </React.Suspense>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};
