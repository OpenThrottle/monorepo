import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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
  METRICS_MAX_SAMPLES,
  METRICS_STORAGE_KEY,
  METRICS_POLLING_INTERVAL_DEFAULT,
  METRICS_POLLING_INTERVALS,
  METRICS_VALID_INTERVALS,
} from '~/global/config/config.metrics';
import {
  formatCpuMs,
  formatMb,
  getStoredPollIntervalMs,
} from '~/global/utils/utils.metrics';

type ServerMetricsSnapshot = GetRootMetricsQuery['serverMetrics'];

/** One sample in the metrics history for the time-series chart. */
interface MetricsChartDatum extends ServerMetricsSnapshot {
  readonly i: number;
}

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

export interface GlobalMetricsProps {
  readonly className?: string;
  /** Optional initial poll interval (ms). When not provided, restored from localStorage or 60s default. */
  readonly pollIntervalMs?: number;
}

export const GlobalMetrics = (props: GlobalMetricsProps) => {
  const { className, pollIntervalMs: propPollIntervalMs } = props;

  // Hooks
  const [intervalMs, setIntervalMs] = React.useState<number>(() => {
    if (propPollIntervalMs !== undefined) return propPollIntervalMs;
    return getStoredPollIntervalMs() ?? METRICS_POLLING_INTERVAL_DEFAULT;
  });

  const query = print(GetRootMetricsDocument);
  const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1hdHRAZG9tYWluLmNvbSIsInN1YiI6IjI5ZTNmOWY0LTNhMzEtNDM2OC05MTE1LTc1YjA3NjQ4YjA2YSIsImlhdCI6MTc3MTU3NTgyNiwiZXhwIjoxNzcxNjYyMjI2fQ.BA3W_-b-GUZGvGJm0n0SJGEdedqrqlIoMzp74H1YR48`;
  const url = ENV_SOURCE.API_URL_GRAPHQL;

  const [metricsHistory, setMetricsHistory] = React.useState<
    readonly MetricsChartDatum[]
  >([]);

  // Setup

  // Handlers
  const handleIntervalChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const valueMs = Number(e.target.value);

      if (!Number.isFinite(valueMs) || !METRICS_VALID_INTERVALS.has(valueMs)) {
        return;
      }
      setIntervalMs(valueMs);

      try {
        window.localStorage.setItem(METRICS_STORAGE_KEY, String(valueMs));
      } catch {
        // ignore
      }
    },
    [],
  );

  // Markup

  // Life Cycle

  // type ServerMetrics = GetRootMetricsQuery['serverMetrics'];
  const { error, loading, serverMetrics } = usePollServerMetrics<
    GetRootMetricsQuery['serverMetrics']
  >({ intervalMs, query, token, url });

  React.useEffect(() => {
    if (serverMetrics == null) return;

    setMetricsHistory((prev) => {
      const next: MetricsChartDatum[] = [
        ...prev,
        { ...serverMetrics, i: prev.length },
      ];

      const sliced = next.slice(-METRICS_MAX_SAMPLES);

      return sliced.map((d, idx) => ({ ...d, i: idx }));
    });
  }, [serverMetrics]);

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="GlobalMetrics">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Server metrics</h2>
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
                    <strong>RSS</strong> - Total process memory including shared
                    libraries. Under 500MB is typical.
                  </li>
                  <li>
                    <strong>Heap</strong> - JS heap memory (used / total). Used
                    near total may indicate memory pressure.
                  </li>
                  <li>
                    <strong>CPU ms</strong> - Cumulative user/system CPU time
                    since process start. Rising steadily is normal; sudden jumps
                    may indicate heavy computation.
                  </li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Poll
          </span>
          <select
            aria-label="Metrics poll interval"
            className="rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-[6.5rem] shrink-0"
            data-testid="GlobalMetrics-poll-interval"
            onChange={handleIntervalChange}
            value={intervalMs}
          >
            {METRICS_POLLING_INTERVALS.map((preset) => (
              <option key={preset.valueMs} value={preset.valueMs}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading && <p data-testid="GlobalMetrics-loading">Loading…</p>}
      {error != null && (
        <p data-testid="GlobalMetrics-error" role="alert">
          {error.message}
        </p>
      )}
      {!loading && error == null && serverMetrics != null && (
        <>
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
          <Card className="mt-4 p-4" data-testid="GlobalMetrics-chart-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Metrics over time
            </h3>
            <ChartContainer
              className="min-h-[160px] w-full -ml-1 text-sm"
              config={METRICS_CHART_CONFIG}
            >
              <LineChart
                data={[...metricsHistory]}
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
        </>
      )}
    </div>
  );
};
