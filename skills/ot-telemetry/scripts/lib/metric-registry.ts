import type pg from 'pg';

import type { CapabilityProbe } from './capability-probe.ts';
import type { ReportWindow } from './envelope.ts';

/**
 * @description The seam later tasks (plan+task, skill-usage, model+agent-run
 * metric families) register against. A {@link MetricQuery} declares the
 * tables/columns it needs; {@link runMetricQueries} checks each against the
 * {@link CapabilityProbe} and only runs the ones that are satisfiable,
 * recording a reason for every one it skips.
 */

/** Tables/columns a metric query needs to be able to run at all. */
export interface MetricRequirement {
  /** Column names required per table, beyond mere table presence. */
  readonly columns?: Readonly<Record<string, readonly string[]>>;
  /** Tables that must exist in `public` for this query to run. */
  readonly tables: readonly string[];
}

/** Context handed to a registered metric query's `run`. */
export interface MetricContext {
  readonly client: pg.Pool;
  readonly probe: CapabilityProbe;
  readonly window: ReportWindow;
}

/** A single named metric family query, self-describing its data requirements. */
export interface MetricQuery<TResult> {
  /** Key this metric is written under in the envelope's `metrics` object. */
  readonly name: string;
  readonly requires: MetricRequirement;
  run(context: MetricContext): Promise<TResult>;
}

/** A metric query that was not run because the capability probe found it unsatisfiable. */
export interface SkippedMetric {
  readonly name: string;
  readonly reason: string;
}

/** Result of running a batch of registered metric queries. */
export interface MetricRunResult {
  readonly metrics: Readonly<Record<string, unknown>>;
  readonly skipped: readonly SkippedMetric[];
}

/** Human-readable reason a requirement is unmet, or `undefined` when it is fully met. */
export function describeUnmetRequirement(
  probe: CapabilityProbe,
  requirement: MetricRequirement,
): string | undefined {
  const missingTables = requirement.tables.filter(
    (table) => !probe.hasTable(table),
  );
  if (missingTables.length > 0) {
    return `missing table(s): ${missingTables.join(', ')}`;
  }

  const missingColumns: string[] = [];
  for (const [table, columns] of Object.entries(requirement.columns ?? {})) {
    const absent = columns.filter(
      (column) => !probe.hasColumns(table, [column]),
    );
    if (absent.length > 0) {
      missingColumns.push(`${table}(${absent.join(', ')})`);
    }
  }
  if (missingColumns.length > 0) {
    return `missing column(s): ${missingColumns.join(', ')}`;
  }

  return undefined;
}

/**
 * Partitions `queries` into runnable vs. skipped against the probe, runs the
 * runnable ones concurrently (no per-query round trip serialization), and
 * returns both the collected metrics and the skip reasons.
 */
export async function runMetricQueries(
  queries: readonly MetricQuery<unknown>[],
  context: MetricContext,
): Promise<MetricRunResult> {
  const runnable: MetricQuery<unknown>[] = [];
  const skipped: SkippedMetric[] = [];

  for (const query of queries) {
    const reason = describeUnmetRequirement(context.probe, query.requires);
    if (reason) {
      skipped.push({ name: query.name, reason });
    } else {
      runnable.push(query);
    }
  }

  const results = await Promise.all(
    runnable.map((query) => query.run(context)),
  );

  const metrics: Record<string, unknown> = {};
  runnable.forEach((query, index) => {
    metrics[query.name] = results[index];
  });

  return { metrics, skipped };
}
