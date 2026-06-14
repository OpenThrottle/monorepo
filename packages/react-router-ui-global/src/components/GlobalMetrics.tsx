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
  GLOBAL_METRICS_POLL_INTERVAL_DEFAULT,
  GLOBAL_METRICS_POLL_INTERVAL_PRESETS,
  GLOBAL_METRICS_STORAGE_KEY,
  GLOBAL_METRICS_VALID_INTERVALS,
} from '../config';
import { formatCpuMs, formatMb } from '../utils/utils.global';
import {
  GlobalMetricsInfoModal,
  GlobalMetricsInfoTrigger,
} from './GlobalMetricsInfoModal';

export interface GlobalMetricsProps {
  readonly className?: string;
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
    definitionsHref,
    diagnosticsHref: _diagnosticsHref = '/settings/debug',
    pollIntervalMs: propPollIntervalMs,
    showSamplingDetails: _showSamplingDetails = true,
  } = props;

  // Hooks
  const [metricsHistory, setMetricsHistory] = React.useState<
    readonly MetricsChartDatum[]
  >([]);

  const [intervalMs, setIntervalMs] = React.useState<number>(() => {
    if (propPollIntervalMs !== undefined) return propPollIntervalMs;

    return getStoredPollIntervalMs() ?? GLOBAL_METRICS_POLL_INTERVAL_DEFAULT;
  });

  // Setup
  const query = print(GetRootMetricsDocument);

  /**
   * HttpOnly auth cookies are not readable in JS; metrics calls run
   * without Bearer unless wired server-side.
   */
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

  React.useLayoutEffect(() => {
    const restored = readStoredMetricsChartHistory();

    if (restored.length === 0) return;

    setMetricsHistory(restored);

    /**
     * 🪝 Restore chart samples from sessionStorage after mount. Initial
     * state stays `[]` on server and on the client’s first render so
     * SSR/hydration markup matches; `useLayoutEffect` runs only in the browser.
     */
  }, []);

  const chartLineData = React.useMemo((): MetricsChartDatum[] => {
    if (metricsHistory.length > 0) {
      return [...metricsHistory];
    }

    if (serverMetrics != null && !loading) {
      return [{ ...serverMetrics, i: 0 }];
    }

    return [];

    /**
     * Chart points: prefer accumulated history; when the first live sample arrives before the append effect runs, show a single synthetic row so the chart is not blank for one frame.
     */
  }, [loading, metricsHistory, serverMetrics]);

  // 🔌 Short Circuit

  const showStatCards = !loading && error == null && serverMetrics != null;
  const showMetricsChart = error == null && chartLineData.length > 0;
  const showGlobalLoadingBanner = loading && metricsHistory.length === 0;

  return (
    <div
      className={classnames(
        'flex w-full flex-col',
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
            <GlobalMetricsInfoTrigger />
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

        <GlobalMetricsInfoModal definitionsHref={definitionsHref} />

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
              className="flex-1 bg-transparent p-4 md:p-8"
              subValue={formatMb(serverMetrics.externalMb)}
              title="RSS / External (MB)"
              value={formatMb(serverMetrics.rssMb)}
            />
            <OpenThrottleStatCard
              className="flex-1 bg-transparent p-4 md:p-8"
              subValue={formatMb(serverMetrics.heapTotalMb)}
              title="Heap (MB)"
              value={formatMb(serverMetrics.heapUsedMb)}
            />
            <OpenThrottleStatCard
              className="flex-1 bg-transparent p-4 md:p-8"
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
          <ChartContainer
            className="-ml-1 min-h-[160px] w-full overflow-visible text-sm"
            config={GLOBAL_METRICS_CHART_CONFIG}
          >
            <LineChart
              data={chartLineData}
              margin={{ bottom: 8, left: 10, right: 12, top: 4 }}
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
