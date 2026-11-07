const TRIMMED_FIELDS = ['dependencies', 'optionalDependencies'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * @description Drops, from a staged third-party `package.json`, the
 * dependencies the stage does not contain (a type-only or never-imported
 * dependency the tracer correctly skipped). electron-builder's `traversal`
 * collector throws on a declared dependency it cannot find; the runtime never
 * requires these, so the manifest is made to say what the stage really holds.
 * Returns the removed names alongside the new manifest.
 */
export const trimUnstagedDependencies = (
  manifest: Readonly<Record<string, unknown>>,
  canResolve: (name: string) => boolean,
): {
  readonly manifest: Readonly<Record<string, unknown>>;
  readonly removed: readonly string[];
} => {
  const removed: string[] = [];
  const next: Record<string, unknown> = { ...manifest };

  for (const field of TRIMMED_FIELDS) {
    const declared = manifest[field];

    if (!isRecord(declared)) {
      continue;
    }

    const kept: Record<string, unknown> = {};

    for (const [name, range] of Object.entries(declared)) {
      if (canResolve(name)) {
        kept[name] = range;
      } else {
        removed.push(name);
      }
    }

    next[field] = kept;
  }

  return { manifest: next, removed };
};
