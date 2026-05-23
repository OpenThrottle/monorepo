import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const MAX_WALK_DEPTH = 12;

const MONOREPO_MARKER_FILES = ['nx.json', 'pnpm-workspace.yaml'] as const;

/**
 * @description Returns true when `dir` contains the files that identify the OpenThrottle monorepo root.
 */
export const isMonorepoRootDirectory = (
  dir: string,
  exists: (path: string) => boolean = existsSync,
): boolean => MONOREPO_MARKER_FILES.every((file) => exists(join(dir, file)));

/**
 * @description Walks upward from `startDir` to find the OpenThrottle monorepo root.
 */
export const findMonorepoRootFromPath = (
  startDir: string,
  exists: (path: string) => boolean = existsSync,
): string | null => {
  let current = startDir;

  for (let depth = 0; depth < MAX_WALK_DEPTH; depth += 1) {
    if (isMonorepoRootDirectory(current, exists)) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return null;
};

const isExistingDirectory = (
  path: string,
  exists: (path: string) => boolean = existsSync,
): boolean => {
  try {
    return exists(path);
  } catch {
    return false;
  }
};

/**
 * @description Resolves the OpenThrottle monorepo root for server-side skills discovery.
 *
 * Order: `WORKSPACE_ROOT` (if set and valid) → walk up from `process.cwd()`.
 * Returns `null` when the root cannot be resolved (deploy without checkout, wrong cwd).
 * Callers such as {@link discoverRepoSkills} then return an empty skills list.
 *
 * **Local:** Nx/Vite often use cwd under `applications/openthrottle-developer`; walk-up
 * finds the repo without setting env. Override with `WORKSPACE_ROOT` in `.env` when needed.
 *
 * **Deploy:** Vercel and minimal Docker images typically have no monorepo checkout; set
 * `WORKSPACE_ROOT` to a mounted volume that includes `.agents/skills` and `.cursor/skills`,
 * or expect zero skills on `/skills`.
 *
 * @see applications/openthrottle-developer/docs/repo-skills-discovery-design.md
 * @see applications/openthrottle-developer/README.md — Skills page (repo skills discovery)
 */
export const getMonorepoRoot = (
  exists: (path: string) => boolean = existsSync,
): string | null => {
  const fromEnv = process.env.WORKSPACE_ROOT?.trim();
  if (fromEnv && isExistingDirectory(fromEnv, exists)) {
    return fromEnv;
  }

  return findMonorepoRootFromPath(process.cwd(), exists);
};
