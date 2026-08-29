/**
 * @description Deterministic JSON serialization for snapshot rows: object keys
 * are sorted recursively so a re-export against unchanged data is byte-identical
 * and the committed snapshot diff stays reviewable. Buffers (bytea columns)
 * become `{ "$bytea": "<hex>" }` so binary data survives the JSONL round trip.
 */

const sortValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Buffer.isBuffer(value)) {
    return { $bytea: value.toString('hex') };
  }

  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1));

    for (const [key, entry] of entries) {
      sorted[key] = sortValue(entry);
    }

    return sorted;
  }

  return value;
};

export const stableStringify = (value: unknown): string =>
  JSON.stringify(sortValue(value));

/**
 * Prettier-compatible serialization for the small `_tables.json` manifest: the
 * wrapper object over two lines and one inline entry per line. `stableStringify`
 * is right for JSONL rows and wrong here — the manifest is the only
 * human-readable summary of the snapshot, and lint-staged's Prettier pass
 * rewrites it to exactly this shape on commit, so emitting it directly keeps
 * exporter output and committed form byte-identical.
 */
export const stableStringifyManifest = (
  entries: readonly Record<string, unknown>[],
): string => {
  const lines = entries.map((entry) => {
    const pairs = Object.entries(entry)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(
        ([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`,
      );

    return `    { ${pairs.join(', ')} }`;
  });

  return `{\n  "tables": [\n${lines.join(',\n')}\n  ]\n}`;
};
