import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { print } from 'graphql';
import {
  OpenThrottleStatCard,
  usePollServerMetrics,
} from '@openthrottle/react-router-ui';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ENV_SOURCE } from '@openthrottle/react-router-utils';
import {
  GetRootMetricsDocument,
  GetRootMetricsQuery,
} from '@openthrottle/openthrottle-developer-codegen';
import {
  getStoredPollIntervalMs,
  readStoredMetricsChartHistory,
  trimMetricsChartData,
  writeStoredMetricsChartHistory,
  type MetricsChartDatum,
} from '../utils/storage';
import {
  GLOBAL_METRICS_CHART_CONFIG,
  GLOBAL_METRICS_CHART_LINE_KEYS,
  GLOBAL_METRICS_POLL_INTERVAL_DEFAULT,
  GLOBAL_METRICS_POLL_INTERVAL_PRESETS,
  GLOBAL_METRICS_STORAGE_KEY,
  GLOBAL_METRICS_VALID_INTERVALS,
} from '../config';
import type { GlobalMetricsChartLineKey } from '../config';
import { formatCpuMs, formatMb } from '../utils/utils.global';
import { GlobalMetricsTooltip } from './GlobalMetricsTooltip';

export interface GlobalMetricsProps {
  readonly className?: string;
  /**
   * In-app link for GraphQL connectivity troubleshooting (e.g. Settings → Debug in openthrottle-developer).
   */
  readonly diagnosticsHref?: string;
  readonly pollIntervalMs?: number;
  /**
   * When true, show a collapsed “Sampling & endpoint” block with poll interval, sample count, and GraphQL URL (for support / debugging).
   */
  readonly showSamplingDetails?: boolean;
}

export const GlobalMetrics = (props: GlobalMetricsProps) => {
  const {
    className,
    diagnosticsHref = '/settings/debug',
    pollIntervalMs: propPollIntervalMs,
    showSamplingDetails = true,
  } = props;

  // Hooks
  const [metricsHistory, setMetricsHistory] = React.useState<
    readonly MetricsChartDatum[]
  >([]);

  /**
   * @description Restore chart samples from sessionStorage after mount. Initial state stays `[]` on server and on the client’s first render so SSR/hydration markup matches; `useLayoutEffect` runs only in the browser.
   */
  React.useLayoutEffect(() => {
    const restored = readStoredMetricsChartHistory();

    if (restored.length === 0) return;

    setMetricsHistory(restored);
  }, []);

  const [intervalMs, setIntervalMs] = React.useState<number>(() => {
    if (propPollIntervalMs !== undefined) return propPollIntervalMs;

    return getStoredPollIntervalMs() ?? GLOBAL_METRICS_POLL_INTERVAL_DEFAULT;
  });

  // Setup
  const query = print(GetRootMetricsDocument);
  /** HttpOnly auth cookies are not readable in JS; metrics calls run without Bearer unless wired server-side. */
  const url = `${ENV_SOURCE.API_URL_EXTERNAL}/graphql`;

  // Handlers
  const handleIntervalChange = React.useCallback((value: string) => {
    const valueMs = Number(value);

    if (
      !Number.isFinite(valueMs) ||
      !GLOBAL_METRICS_VALID_INTERVALS.has(valueMs)
    ) {
      return;
    }
    setIntervalMs(valueMs);

    try {
      window.localStorage.setItem(GLOBAL_METRICS_STORAGE_KEY, String(valueMs));
    } catch {
      // ignore
    }
  }, []);

  // Markup

  // Life Cycle
  const { error, loading, serverMetrics } = usePollServerMetrics<
    GetRootMetricsQuery['serverMetrics']
  >({ intervalMs, query, url });

  React.useEffect(() => {
    if (serverMetrics == null) return;

    let trimmed: readonly MetricsChartDatum[] = [];

    setMetricsHistory((prev) => {
      const next: MetricsChartDatum[] = [
        ...prev,
        { ...serverMetrics, i: prev.length },
      ];

      trimmed = trimMetricsChartData(next);
      writeStoredMetricsChartHistory(trimmed);

      return trimmed;
    });

    // 🪝 Update metrics history as our interval elapses
  }, [serverMetrics]);

  /**
   * @description Chart points: prefer accumulated history; when the first live sample arrives before the append effect runs, show a single synthetic row so the chart is not blank for one frame.
   */
  const chartLineData = React.useMemo((): MetricsChartDatum[] => {
    if (metricsHistory.length > 0) {
      return [...metricsHistory];
    }
    if (serverMetrics != null && !loading) {
      return [{ ...serverMetrics, i: 0 }];
    }
    return [];
  }, [loading, metricsHistory, serverMetrics]);

  const metricsEndpointSummary = React.useMemo((): string => {
    try {
      const parsed = new URL(url);

      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return url;
    }
  }, [url]);

  const pollIntervalLabel = React.useMemo((): string => {
    const preset = GLOBAL_METRICS_POLL_INTERVAL_PRESETS.find(
      (p) => p.valueMs === intervalMs,
    );

    if (preset) return preset.label;

    return `${intervalMs} ms`;
  }, [intervalMs]);

  const showStatCards = !loading && error == null && serverMetrics != null;
  const showMetricsChart = error == null && chartLineData.length > 0;
  const showGlobalLoadingBanner = loading && metricsHistory.length === 0;

  // 🔌 Short Circuit
  // if (!IS_PRODUCTION) {
  //   return null;
  // }

  return (
    <div
      className={classnames(
        'flex flex-col w-full',
        'gap-4 md:gap-8 lg:gap-12',
        'p-4 md:p-8 lg:p-12',
        className,
      )}
      data-testid="GlobalMetrics"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-muted-foreground">Server metrics</h2>
            <GlobalMetricsTooltip />
          </div>
          <Label className="flex items-center gap-2">
            <span>Poll</span>
            <Select
              aria-label="Metrics poll interval"
              onValueChange={handleIntervalChange}
              value={intervalMs.toString()}
            >
              <SelectTrigger
                className="w-[80px]"
                data-testid="GlobalMetrics-poll-interval"
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
        </div>

        <p
          className="text-xs text-muted-foreground max-w-3xl leading-relaxed"
          data-testid="GlobalMetrics-visibility-hint"
        >
          Samples poll the{' '}
          <strong className="text-foreground/90">openthrottle-server</strong>{' '}
          GraphQL endpoint (<code className="text-[10px]">serverMetrics</code>)
          from your browser; they reflect server process memory and CPU, not
          this tab. The strip is hidden on auth, profile, settings, prompts, and
          create routes. Hover or focus the (i) control next to{' '}
          <strong className="text-foreground/90">Server metrics</strong> for
          full definitions.{' '}
          <a
            className="font-medium text-foreground underline underline-offset-2"
            href={diagnosticsHref}
          >
            Settings: GraphQL health & env
          </a>
          .
        </p>

        {showSamplingDetails ? (
          <details
            className="group rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground max-w-3xl"
            data-testid="GlobalMetrics-debug-details"
          >
            <summary className="cursor-pointer select-none font-medium text-foreground/90 outline-none marker:text-muted-foreground">
              Sampling & endpoint details
            </summary>
            <dl className="mt-3 grid gap-2 border-t border-border/50 pt-3 font-mono text-[11px] leading-relaxed sm:grid-cols-[auto_1fr] sm:gap-x-4">
              <dt className="text-muted-foreground">Poll</dt>
              <dd className="text-foreground/90">
                {pollIntervalLabel}
                {intervalMs <= 0
                  ? ' — only the initial fetch runs; use a timed interval to fill the chart.'
                  : null}
              </dd>
              <dt className="text-muted-foreground">Chart samples</dt>
              <dd className="text-foreground/90">{chartLineData.length}</dd>
              <dt className="text-muted-foreground">GraphQL URL</dt>
              <dd className="break-all text-foreground/90">
                {metricsEndpointSummary}
              </dd>
            </dl>
            <p className="mt-3 border-t border-border/50 pt-3 text-[11px] leading-relaxed">
              Chart lines: RSS and heap are megabytes; CPU user is milliseconds
              (same units as the cards). System CPU is shown on the card only.
            </p>
          </details>
        ) : null}

        {showGlobalLoadingBanner && (
          <p data-testid="GlobalMetrics-loading">Loading…</p>
        )}

        {error != null && (
          <p data-testid="GlobalMetrics-error" role="alert">
            {error.message}
          </p>
        )}

        {showStatCards && serverMetrics != null && (
          <div
            className="flex flex-wrap gap-4 md:gap-8 lg:gap-12"
            data-testid="GlobalMetrics-data"
          >
            <OpenThrottleStatCard
              className="p-4 md:p-8 flex-1 bg-transparent"
              subValue={formatMb(serverMetrics.externalMb)}
              title="RSS / External (MB)"
              value={formatMb(serverMetrics.rssMb)}
            />
            <OpenThrottleStatCard
              className="p-4 md:p-8 flex-1 bg-transparent"
              subValue={formatMb(serverMetrics.heapTotalMb)}
              title="Heap (MB)"
              value={formatMb(serverMetrics.heapUsedMb)}
            />
            <OpenThrottleStatCard
              className="p-4 md:p-8 flex-1 bg-transparent"
              subValue={formatCpuMs(serverMetrics.cpuSystemMs)}
              title="CPU (ms) user / system"
              value={formatCpuMs(serverMetrics.cpuUserMs)}
            />
          </div>
        )}
      </div>

      {showMetricsChart && (
        <Card
          className={classnames('p-4 md:p-8')}
          data-testid="GlobalMetrics-chart-card"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Metrics over time
            </h3>
            {loading && metricsHistory.length > 0 ? (
              <p
                className="text-xs text-muted-foreground"
                data-testid="GlobalMetrics-chart-stale-hint"
              >
                Loading latest metrics…
              </p>
            ) : null}
          </div>

          <div
            aria-label="Chart series"
            className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground"
            data-testid="GlobalMetrics-chart-legend"
          >
            {GLOBAL_METRICS_CHART_LINE_KEYS.map(
              (key: GlobalMetricsChartLineKey) => {
                const entry = GLOBAL_METRICS_CHART_CONFIG[key];
                if (!entry?.label || !entry.color) return null;

                return (
                  <span className="inline-flex items-center gap-1.5" key={key}>
                    <span
                      aria-hidden={true}
                      className="inline-block h-2 w-4 shrink-0 rounded-sm"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.label}</span>
                  </span>
                );
              },
            )}
          </div>

          <ChartContainer
            className="min-h-[160px] w-full -ml-1 text-sm"
            config={GLOBAL_METRICS_CHART_CONFIG}
          >
            <LineChart
              data={chartLineData}
              margin={{ bottom: 8, left: 0, right: 12, top: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="i"
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={4}
                width={36}
              />
              <ChartTooltip content={<ChartTooltipContent labelKey="i" />} />
              <Line
                dataKey="rssMb"
                dot={false}
                stroke="var(--color-rssMb)"
                strokeWidth={1.5}
                type="monotone"
              />
              <Line
                dataKey="heapUsedMb"
                dot={false}
                stroke="var(--color-heapUsedMb)"
                strokeWidth={1.5}
                type="monotone"
              />
              <Line
                dataKey="cpuUserMs"
                dot={false}
                stroke="var(--color-cpuUserMs)"
                strokeWidth={1.5}
                type="monotone"
              />
            </LineChart>
          </ChartContainer>
        </Card>
      )}
    </div>
  );
};
