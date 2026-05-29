import { createProjectGraphAsync } from '@nx/devkit';
import { setWorkspaceRoot, workspaceRoot } from 'nx/src/utils/workspace-root';
import { resolveOpenThrottleRoot } from '@openthrottle/ai-mcp/src/cortex-server';

/** NX project graph node types we treat as "projects" (applications + packages). */
const PROJECT_TAGS = ['type:application', 'type:package'] as const;

/** Nx env var that overrides workspace-root detection (read before the cwd walk-up). */
export const NX_WORKSPACE_ROOT_PATH_ENV = `NX_WORKSPACE_ROOT_PATH`;

/** Result of {@link pinNxWorkspaceRootToOpenThrottle}. */
export interface PinNxWorkspaceRootResult {
  /** Restores the env + cached workspace root to their pre-pin values. */
  readonly restore: () => void;
  /** The resolved OpenThrottle root, or undefined when it could not be located. */
  readonly workspaceRoot: string | undefined;
}

/**
 * @description Pins Nx project-graph resolution to the OpenThrottle monorepo root so `--project`
 * validation uses the OpenThrottle graph regardless of a foreign `cwd` (a `workingDirectory` outside
 * this monorepo). Without this, {@link createProjectGraphAsync} resolves the graph from `process.cwd()`
 * and yields the target repo's graph (or none), breaking validation and polluting logs with
 * bare/incomplete nx invocations.
 *
 * It sets {@link NX_WORKSPACE_ROOT_PATH_ENV}, disables the Nx daemon (so the graph is built in-process
 * against the pinned root instead of a foreign-cwd daemon), and updates Nx's cached `workspaceRoot`.
 * The returned `restore()` reverts all three. The OpenThrottle root is resolved via
 * {@link resolveOpenThrottleRoot} (`WORKFLOW_RALPH_OT_ROOT` → `WORKSPACE_ROOT` → module walk-up → cwd).
 * When the root cannot be resolved, this is a no-op and `restore()` does nothing.
 */
export const pinNxWorkspaceRootToOpenThrottle = (
  env: NodeJS.ProcessEnv = process.env,
): PinNxWorkspaceRootResult => {
  const otRoot = resolveOpenThrottleRoot(env);
  if (!otRoot) {
    return { restore: (): void => {}, workspaceRoot: undefined };
  }

  const previousRootPath = env[NX_WORKSPACE_ROOT_PATH_ENV];
  const previousDaemon = env.NX_DAEMON;
  const previousWorkspaceRoot = workspaceRoot;

  env[NX_WORKSPACE_ROOT_PATH_ENV] = otRoot;
  env.NX_DAEMON = `false`;
  setWorkspaceRoot(otRoot);

  const restore = (): void => {
    if (previousRootPath === undefined) {
      delete env[NX_WORKSPACE_ROOT_PATH_ENV];
    } else {
      env[NX_WORKSPACE_ROOT_PATH_ENV] = previousRootPath;
    }

    if (previousDaemon === undefined) {
      delete env.NX_DAEMON;
    } else {
      env.NX_DAEMON = previousDaemon;
    }

    setWorkspaceRoot(previousWorkspaceRoot);
  };

  return { restore, workspaceRoot: otRoot };
};

/**
 * @description Returns NX project names from the project graph (applications and packages). Use for --project option or validation in workflow and Cortex API. The graph is pinned to the OpenThrottle monorepo root (see {@link pinNxWorkspaceRootToOpenThrottle}) so it resolves correctly even when `cwd` is a foreign checkout.
 */
export const getNxProjectNames = async (): Promise<string[]> => {
  const { restore } = pinNxWorkspaceRootToOpenThrottle();

  try {
    const { nodes } = await createProjectGraphAsync();
    const projects = Object.values(nodes);
    const names = projects
      .filter((project) => {
        const tags = project.data?.tags ?? [];
        return PROJECT_TAGS.some((tag) => tags.includes(tag));
      })
      .map((project) => project.name);

    return names.sort((a, b) => a.localeCompare(b));
  } finally {
    restore();
  }
};
