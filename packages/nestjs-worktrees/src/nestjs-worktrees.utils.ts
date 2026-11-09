interface WorktreeTargetEntry {
  id: string;
  path: string;
}

/**
 * @description Type guard for the tuple form `[id, path]`. Narrows an unknown
 * array item to a `[string, string]` pair without an `as` cast.
 */
function isStringPair(item: unknown): item is readonly [string, string] {
  return (
    Array.isArray(item) &&
    item.length >= 2 &&
    typeof item[0] === 'string' &&
    typeof item[1] === 'string'
  );
}

/**
 * @description Type guard for the object form `{ id, path }`. Narrows an unknown
 * item to a `WorktreeTargetEntry` (both fields present and string) without a cast.
 */
function isIdPathObject(item: unknown): item is WorktreeTargetEntry {
  if (item == null || typeof item !== 'object') return false;

  if (!('id' in item) || !('path' in item)) return false;

  const { id, path }: { id: unknown; path: unknown } = item;

  return typeof id === 'string' && typeof path === 'string';
}

/**
 * @description Parses WORKTREE_TARGETS env into initial targets. Accepts:
 * - Array of objects: [{"id":"wt1","path":"/path/to/wt1"}]
 * - Array of [id, path] tuples: [["wt1","/path/to/wt1"],["wt2","/path/to/wt2"]]
 */
export function getWorktreeTargetsFromEnv(): readonly WorktreeTargetEntry[] {
  const raw = process.env.WORKTREE_TARGETS;

  if (!raw?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item: unknown): WorktreeTargetEntry | null => {
        if (isStringPair(item)) {
          const [id, path] = item;

          return { id, path };
        }

        if (isIdPathObject(item)) {
          return { id: item.id, path: item.path };
        }

        return null;
      })
      .filter((t): t is WorktreeTargetEntry => t != null);
  } catch {
    return [];
  }
}
