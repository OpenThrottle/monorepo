import type {
  CapabilityProbe,
  MetricContext,
  MetricQuery,
  MetricRequirement,
  MetricRunResult,
  SkippedMetric,
} from '../../types/index.ts';

/**
 * @description The seam every metric family registers against. A {@link MetricQuery} declares the
 * tables/columns it needs; {@link runMetricQueries} checks each against the
 * {@link CapabilityProbe} and only runs the ones that are satisfiable,
 * recording a reason for every one it skips.
 */

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
