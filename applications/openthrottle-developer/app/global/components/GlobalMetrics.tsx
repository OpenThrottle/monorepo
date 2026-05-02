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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type ChartConfig,
} from '@openthrottle/react-router-shadcn';
import { print } from 'graphql';
import { Info } from 'lucide-react';
import {
  OpenThrottleStatCard,
  usePollServerMetrics,
} from '@openthrottle/react-router-ui';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ENV_SOURCE } from '@openthrottle/react-router-utils';
import {
  GetRootMetricsDocument,
  type GetRootMetricsQuery,
} from '~/__generated__/graphql';
import {
  readStoredMetricsChartHistory,
  trimMetricsChartData,
  writeStoredMetricsChartHistory,
  type MetricsChartDatum,
} from '~/global/components/global-metrics-chart-history-storage';

const STORAGE_KEY = 'openthrottle-developer:metricsPollInterval';
const DEFAULT_POLL_INTERVAL_MS = 60_000;

const POLL_INTERVAL_PRESETS: readonly {
  readonly label: string;
  readonly valueMs: number;
}[] = [
  { label: '60s', valueMs: 60_000 },
  { label: '30s', valueMs: 30_000 },
  { label: '15s', valueMs: 15_000 },
  { label: '5s', valueMs: 5_000 },
  { label: 'Off', valueMs: 0 },
];

const VALID_INTERVALS = new Set(POLL_INTERVAL_PRESETS.map((p) => p.valueMs));

/** Muted, low-saturation colors for chart lines (background-style). */
const METRICS_CHART_CONFIG: ChartConfig = {
  cpuUserMs: {
    color: 'hsl(30 18% 55%)',
    label: 'CPU user (ms)',
  },
  heapUsedMb: {
    color: 'hsl(160 18% 48%)',
    label: 'Heap used (MB)',
  },
  rssMb: {
    color: 'hsl(220 18% 52%)',
    label: 'RSS (MB)',
  },
};

/**
 * @description Reads persisted poll interval from localStorage; returns null if missing or invalid.
 */
function getStoredPollIntervalMs(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && VALID_INTERVALS.has(n) ? n : null;
  } catch {
    return null;
  }
}

/** Format MB values to 2 decimal places for display in stat cards. */
const formatMb = (value: number): number => Number(value.toFixed(2));

/** Format CPU ms (cumulative) for display; show integer when possible. */
const formatCpuMs = (value: number): number => Number(value.toFixed(0));

export interface GlobalMetricsProps {
  readonly className?: string;
  /** Optional initial poll interval (ms). When not provided, restored from localStorage or 60s default. */
  readonly pollIntervalMs?: number;
}

export const GlobalMetrics = (props: GlobalMetricsProps) => {
  const { className, pollIntervalMs: propPollIntervalMs } = props;

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

    return getStoredPollIntervalMs() ?? DEFAULT_POLL_INTERVAL_MS;
  });

  // Setup
  const query = print(GetRootMetricsDocument);
  const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1hdHRAZG9tYWluLmNvbSIsInN1YiI6IjI5ZTNmOWY0LTNhMzEtNDM2OC05MTE1LTc1YjA3NjQ4YjA2YSIsImlhdCI6MTc3MTU3NTgyNiwiZXhwIjoxNzcxNjYyMjI2fQ.BA3W_-b-GUZGvGJm0n0SJGEdedqrqlIoMzp74H1YR48`;
  const url = `${ENV_SOURCE.API_URL_EXTERNAL}/graphql`;

  // Handlers
  const handleIntervalChange = React.useCallback((value: string) => {
    const valueMs = Number(value);

    if (!Number.isFinite(valueMs) || !VALID_INTERVALS.has(valueMs)) return;
    setIntervalMs(valueMs);

    try {
      window.localStorage.setItem(STORAGE_KEY, String(valueMs));
    } catch {
      // ignore
    }
  }, []);

  // Markup

  // Life Cycle
  const { error, loading, serverMetrics } = usePollServerMetrics<
    GetRootMetricsQuery['serverMetrics']
  >({ intervalMs, query, token, url });

  React.useEffect(() => {
    if (serverMetrics == null) return;

    let trimmed: readonly MetricsChartDatum[] = [];
    setMetricsHistory((prev) => {
      const next: MetricsChartDatum[] = [
        ...prev,
        { ...serverMetrics, i: prev.length },
      ];
      trimmed = trimMetricsChartData(next);
      return trimmed;
    });
    writeStoredMetricsChartHistory(trimmed);

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

  const showStatCards =
    !loading && error == null && serverMetrics != null;
  const showMetricsChart = error == null && chartLineData.length > 0;
  const showGlobalLoadingBanner = loading && metricsHistory.length === 0;

  // 🔌 Short Circuit
  // if (!IS_PRODUCTION) {
  //   return null;
  // }

  return (
    <div className={classnames('p-4', className)} data-testid="GlobalMetrics">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-muted">Server metrics</h2>
          <TooltipProvider>
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
                className="max-w-xs text-sm"
                data-testid="GlobalMetrics-info-tooltip"
                side="right"
              >
                <p className="font-semibold mb-1">
                  Understanding these metrics:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong>RSS</strong> – Total process memory including shared
                    libraries. Under 500MB is typical.
                  </li>
                  <li>
                    <strong>Heap</strong> – JS heap memory (used / total). Used
                    near total may indicate memory pressure.
                  </li>
                  <li>
                    <strong>CPU ms</strong> – Cumulative user/system CPU time
                    since process start. Rising steadily is normal; sudden jumps
                    may indicate heavy computation.
                  </li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
              {POLL_INTERVAL_PRESETS.map((preset) => (
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
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
          data-testid="GlobalMetrics-data"
        >
          <OpenThrottleStatCard
            subValue={formatMb(serverMetrics.externalMb)}
            title="RSS / External (MB)"
            value={formatMb(serverMetrics.rssMb)}
          />
          <OpenThrottleStatCard
            subValue={formatMb(serverMetrics.heapTotalMb)}
            title="Heap (MB)"
            value={formatMb(serverMetrics.heapUsedMb)}
          />
          <OpenThrottleStatCard
            subValue={formatCpuMs(serverMetrics.cpuSystemMs)}
            title="CPU (ms) user / system"
            value={formatCpuMs(serverMetrics.cpuUserMs)}
          />
        </div>
      )}
      {showMetricsChart && (
        <Card
          className={classnames('p-4', showStatCards ? 'mt-4' : 'mt-0')}
          data-testid="GlobalMetrics-chart-card"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">
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
          <ChartContainer
            className="min-h-[160px] w-full -ml-1 text-sm"
            config={METRICS_CHART_CONFIG}
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
              <ChartTooltip content={<ChartTooltipContent />} />
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
