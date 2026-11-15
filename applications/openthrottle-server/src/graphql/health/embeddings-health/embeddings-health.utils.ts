/**
 * @description Pure helpers for the embeddings section of server health (OT plan 165e86ef).
 */

import type { EmbedderState } from '../../../services/embedder/embedder.types.ts';
import type {
  EmbeddingCoverage,
  EmbeddingsHealthStatus,
  EmbeddingsHealthThresholds,
} from './embeddings-health.types.ts';

const DEFAULT_MIN_COVERAGE = 0.99;

const DEFAULT_MAX_QUEUE_BACKLOG = 500;

/**
 * @description Reads `EMBEDDINGS_HEALTH_MIN_COVERAGE` (a fraction, default 0.99) and
 * `EMBEDDINGS_HEALTH_MAX_BACKLOG` (jobs, default 500); invalid values fall back.
 */
export function resolveEmbeddingsHealthThresholds(
  env: NodeJS.ProcessEnv = process.env,
): EmbeddingsHealthThresholds {
  const coverage = Number(env.EMBEDDINGS_HEALTH_MIN_COVERAGE?.trim());
  const backlog = Number(env.EMBEDDINGS_HEALTH_MAX_BACKLOG?.trim());
  const isCoverageValid = Number.isFinite(coverage) && coverage > 0;
  const isBacklogValid = Number.isInteger(backlog) && backlog >= 0;

  return {
    maxQueueBacklog: isBacklogValid ? backlog : DEFAULT_MAX_QUEUE_BACKLOG,
    minCoverage: isCoverageValid ? Math.min(coverage, 1) : DEFAULT_MIN_COVERAGE,
  };
}

/** @description Share of a table's rows with an up-to-date vector; an empty table is fully covered. */
export function coverageRatio(coverage: EmbeddingCoverage): number {
  return coverage.total === 0 ? 1 : coverage.embedded / coverage.total;
}

/** @description Folds embedder state, coverage and backlog into one status. */
export function classifyEmbeddingsHealth(
  state: EmbedderState,
  coverage: readonly EmbeddingCoverage[],
  queueDepth: number | null,
  thresholds: EmbeddingsHealthThresholds,
): EmbeddingsHealthStatus {
  if (state === 'unconfigured' || state === 'dimension_mismatch') {
    return 'unconfigured';
  }

  const isUnderCovered = coverage.some((table) => {
    return coverageRatio(table) < thresholds.minCoverage;
  });
  const isBacklogged =
    queueDepth !== null && queueDepth > thresholds.maxQueueBacklog;

  if (state === 'provider_error' || isUnderCovered || isBacklogged) {
    return 'degraded';
  }

  return 'ok';
}
