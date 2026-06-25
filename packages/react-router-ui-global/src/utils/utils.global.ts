// import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
// import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
// import { HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
// import { LockIcon } from '@phosphor-icons/react/dist/ssr/Lock';
// import { ADMIN_PATHS, dataNavigation } from '~/global/data/data.navigation';

import { LinkProps } from 'react-router';
import type {
  GetRootMetricsQuery,
  ServerHealthObject,
} from '@openthrottle/openthrottle-developer-codegen';

/**
 * @description Normalized status for a single health component (or the folded
 * worst-case across all components). Anything the server does not report as a
 * recognized value is treated as `unconfigured` (unknown).
 */
export type HealthStatus = 'ok' | 'unconfigured' | 'unreachable';

/**
 * @description Components folded into the overall health status. Mirrors the
 * non-null fields of {@link ServerHealthObject} so a dead socket layer cannot
 * silently report "online".
 */
const HEALTH_COMPONENT_KEYS = [
  'api',
  'database',
  'redis',
  'websocket',
] as const satisfies readonly (keyof ServerHealthObject)[];

/**
 * @description Coerces a raw server health value into a {@link HealthStatus}.
 * `ok`/`unreachable` pass through; everything else (including `unconfigured`,
 * empty, or unexpected strings) collapses to `unconfigured`.
 */
const normalizeHealthStatus = (value: string | undefined): HealthStatus => {
  if (value === 'ok') {
    return 'ok';
  }
  if (value === 'unreachable') {
    return 'unreachable';
  }
  return 'unconfigured';
};

/**
 * @description Folds every health component (`api/database/redis/websocket`)
 * into a single worst-case {@link HealthStatus}: any `unreachable` wins, then
 * any `unconfigured`/unknown, otherwise `ok`. Returns `unconfigured` when no
 * health payload is present so the UI never claims "online" without data.
 */
export const deriveOverallHealthStatus = (
  health: ServerHealthObject | undefined,
): HealthStatus => {
  if (health == null) {
    return 'unconfigured';
  }

  let worst: HealthStatus = 'ok';
  for (const key of HEALTH_COMPONENT_KEYS) {
    const status = normalizeHealthStatus(health[key]);
    if (status === 'unreachable') {
      return 'unreachable';
    }
    if (status === 'unconfigured') {
      worst = 'unconfigured';
    }
  }

  return worst;
};

/**
 * @description Single source of truth mapping a {@link HealthStatus} to its
 * status-dot Tailwind background class. Shared by every footer so `ok`,
 * `unconfigured`, and `unreachable` look identical everywhere.
 */
export const healthStatusColorClass = (status: HealthStatus): string => {
  switch (status) {
    case 'ok':
      return 'bg-green-500';
    case 'unreachable':
      return 'bg-red-500';
    case 'unconfigured':
      return 'bg-amber-500';
  }
};

/**
 * @description Convenience for per-component status dots: normalizes one raw
 * server health value and returns its dot color class. Same `ok → green`,
 * `unreachable → red`, `unconfigured`/unknown → amber mapping as the folded
 * overall status, so both footers stay in agreement.
 */
export const healthValueColorClass = (value: string | undefined): string => {
  return healthStatusColorClass(normalizeHealthStatus(value));
};

/** Format MB values to 2 decimal places for display in stat cards. */
export const formatMb = (value: number): number => {
  return Number(value.toFixed(2));
};

/** Format CPU ms (cumulative) for display; show integer when possible. */
export const formatCpuMs = (value: number): number => {
  return Number(value.toFixed(0));
};

/**
 * @description Compact one-line summary of the latest metrics sample shown in
 * the metrics panel's collapsed header (e.g. `RSS 145 MB · Heap 87 MB · CPU
 * 12340 ms`). Returns an em-dash placeholder when no sample is available yet.
 */
export const formatMetricsSummary = (
  metrics: GetRootMetricsQuery['serverMetrics'] | null | undefined,
): string => {
  if (metrics == null) return '—';

  return [
    `RSS ${formatMb(metrics.rssMb)} MB`,
    `Heap ${formatMb(metrics.heapUsedMb)} MB`,
    `CPU ${formatCpuMs(metrics.cpuUserMs).toLocaleString()} ms`,
  ].join(' · ');
};

export function getPathFromTo(to: LinkProps['to']): string {
  return typeof to === 'string' ? to : (to.pathname ?? '/');
}
