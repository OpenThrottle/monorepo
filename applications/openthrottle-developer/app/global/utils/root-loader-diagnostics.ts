import type { ServerHealthObject } from '~/__generated__/graphql';

/** Health snapshot when the root loader cannot reach openthrottle-server for serverHealth. */
export const ROOT_LOADER_UNREACHABLE_HEALTH: ServerHealthObject = {
  api: 'unreachable',
  database: 'unreachable',
  redis: 'unreachable',
  websocket: 'unreachable',
};

export type RootLoaderFailureKind = 'graphql' | 'transport' | 'unknown';

export interface RootLoaderFailure {
  readonly kind: RootLoaderFailureKind;
  readonly message: string;
  readonly step: 'health' | 'user';
}

export interface RootLoaderDiagnostics {
  readonly healthLatencyMs?: number;
  readonly userLatencyMs?: number;
}

/**
 * @description Maps thrown loader errors to a coarse category for UX copy.
 */
export const classifyRootLoaderError = (
  error: unknown,
): RootLoaderFailureKind => {
  const msg =
    error instanceof Error ? error.message : String(error ?? 'unknown');
  if (msg.includes('GraphQL errors:')) {
    return 'graphql';
  }
  if (msg.includes('openthrottle-server GraphQL error')) {
    return 'transport';
  }
  if (error instanceof TypeError) {
    return 'transport';
  }
  if (
    /fetch|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network/i.test(msg) ||
    /Failed to fetch/i.test(msg)
  ) {
    return 'transport';
  }
  return 'unknown';
};

/**
 * @description Stable string for UI and support bundles; full message may be long.
 */
export const rootLoaderErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? 'Unknown error');
};

/**
 * @description Truncates long GraphQL or stack fragments for the banner.
 */
export const truncateForBanner = (text: string, maxLength: number): string => {
  const t = text.trim();
  if (t.length <= maxLength) {
    return t;
  }
  return `${t.slice(0, maxLength)}…`;
};

/**
 * @description Human-readable label for {@link RootLoaderFailureKind}.
 */
export const rootLoaderFailureKindLabel = (
  kind: RootLoaderFailureKind,
): string => {
  switch (kind) {
    case 'graphql':
      return 'GraphQL error';
    case 'transport':
      return 'Connection or HTTP error';
    default:
      return 'Request failed';
  }
};
