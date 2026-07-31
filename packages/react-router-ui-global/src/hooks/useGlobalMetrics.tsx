import * as React from 'react';
import { print } from 'graphql';
import { usePollServerMetrics } from '@openthrottle/react-router-ui';
import { ENV_SOURCE } from '@openthrottle/react-router-utils';
import {
  GetRootMetricsDocument,
  GetRootMetricsQuery,
} from '@openthrottle/openthrottle-developer-codegen';
import {
  getStoredMetricsCollapsed,
  getStoredPollIntervalMs,
  readStoredMetricsChartHistory,
  trimMetricsChartData,
  writeStoredMetricsChartHistory,
  writeStoredMetricsCollapsed,
  type MetricsChartDatum,
} from '../utils/storage';
import {
  GLOBAL_METRICS_POLL_INTERVAL_DEFAULT,
  GLOBAL_METRICS_STORAGE_KEY,
  GLOBAL_METRICS_VALID_INTERVALS,
} from '../config';

/** Options for {@link useGlobalMetrics}. */
export interface UseGlobalMetricsOptions {
  /** Whether the metrics panel should be open by default. */
  readonly defaultOpen?: boolean;
  readonly pollIntervalMs?: number;
}

/** Return value of {@link useGlobalMetrics}. */
export interface UseGlobalMetricsResult {
  readonly chartLineData: MetricsChartDatum[];
  readonly error: Error | null;
  readonly handleIntervalChange: (value: string) => void;
  readonly handleOpenChange: (next: boolean) => void;
  readonly intervalMs: number;
  readonly isOpen: boolean;
  readonly loading: boolean;
  readonly serverMetrics: GetRootMetricsQuery['serverMetrics'] | null;
  readonly showGlobalLoadingBanner: boolean;
  readonly showMetricsChart: boolean;
  readonly showStatCards: boolean;
}

/**
 * @description Owns the `GlobalMetrics` panel behavior: polls server metrics,
 * accumulates the trimmed chart history (mirrored to sessionStorage), restores
 * the persisted collapsed/open and poll-interval preferences, and exposes the
 * open/interval handlers plus the derived visibility flags the markup needs.
 */
export const useGlobalMetrics = (
  options: UseGlobalMetricsOptions,
): UseGlobalMetricsResult => {
  const { defaultOpen = true, pollIntervalMs: propPollIntervalMs } = options;

  // Hooks
  const [isOpen, setIsOpen] = React.useState<boolean>(defaultOpen);
  const [metricsHistory, setMetricsHistory] = React.useState<
    readonly MetricsChartDatum[]
  >([]);

  const [intervalMs, setIntervalMs] = React.useState<number>(() => {
    if (propPollIntervalMs !== undefined) return propPollIntervalMs;

    return getStoredPollIntervalMs() ?? GLOBAL_METRICS_POLL_INTERVAL_DEFAULT;
  });

  // Setup
  const query = React.useMemo(() => print(GetRootMetricsDocument), []);

  /**
   * HttpOnly auth cookies are not readable in JS; metrics calls run
   * without Bearer unless wired server-side.
   *
   * Memoized so the reference is stable across renders; `usePollServerMetrics`
   * can then safely depend on `url`/`query` without re-subscribing each render.
   */
  const url = React.useMemo(() => `${ENV_SOURCE.API_URL_EXTERNAL}/graphql`, []);

  // Handlers
  const handleOpenChange = React.useCallback((next: boolean) => {
    setIsOpen(next);
    writeStoredMetricsCollapsed(!next);
  }, []);

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

  React.useLayoutEffect(() => {
    const collapsed = getStoredMetricsCollapsed();
    if (collapsed == null) return;

    setIsOpen(!collapsed);

    /**
     * 🪝 Restore the collapsed/open preference from sessionStorage after mount.
     * Initial state stays open on the server and on the client’s first render so
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

  return {
    chartLineData,
    error,
    handleIntervalChange,
    handleOpenChange,
    intervalMs,
    isOpen,
    loading,
    serverMetrics,
    showGlobalLoadingBanner,
    showMetricsChart,
    showStatCards,
  };
};
