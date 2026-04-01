// FIXME: Swap out eventually
/* eslint-disable @typescript-eslint/consistent-type-assertions */

/**
 * @description Parses WORKTREE_TARGETS env into initial targets. Accepts:
 * - Array of objects: [{"id":"wt1","path":"/path/to/wt1"}]
 * - Array of [id, path] tuples: [["wt1","/path/to/wt1"],["wt2","/path/to/wt2"]]
 */
export function getWorktreeTargetsFromEnv(): readonly {
  id: string;
  path: string;
}[] {
  const raw = process.env.WORKTREE_TARGETS;

  if (!raw?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item: unknown): { id: string; path: string } | null => {
        if (Array.isArray(item) && item.length >= 2) {
          const [id, path] = item as [unknown, unknown];

          if (typeof id === 'string' && typeof path === 'string') {
            return { id, path } as { id: string; path: string };
          }
        }

        if (
          item != null &&
          typeof item === 'object' &&
          typeof (item as { id?: string }).id === 'string' &&
          typeof (item as { path?: string }).path === 'string'
        ) {
          return item as { id: string; path: string };
        }

        return null;
      })
      .filter((t): t is { id: string; path: string } => t != null);
  } catch {
    return [];
  }
}
