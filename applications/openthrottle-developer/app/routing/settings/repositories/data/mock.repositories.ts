import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import { WorktreeActivity, WorktreeRootSource } from '~/__generated__/graphql';
import type {
  DiscoveredWorktree,
  DiscoveredWorktreesResult,
  RepositoryCheckout,
} from '~/routing/settings/repositories/data/types';

export interface MockCheckoutOverrides {
  branch?: string | null;
  displayName?: string;
  filesystemPath?: string;
  foreignSkillInjectionEnabled?: boolean;
  id: string;
  kind?: string;
  managed?: boolean;
  repositoryId?: string;
  updatedAt?: string;
}

export interface MockDiscoveredWorktreeOverrides {
  activity?: DiscoveredWorktree['activity'];
  branch?: string | null;
  checkoutId?: string | null;
  name: string;
  path?: string;
  planId?: string | null;
  planRunId?: string | null;
  repositoryId?: string | null;
  unregistered?: boolean;
}

export interface MockRepositoryOverrides {
  checkouts?: RepositoryCheckout[];
  defaultBranch?: string | null;
  id: string;
  name?: string;
  normalizedRemoteUrl?: string | null;
  updatedAt?: string;
}

/**
 * @description Minimal checkout fixture for the repositories row-model specs.
 * `branch` fills in the inspection's `git.currentBranch`; pass `null` to model a
 * checkout that has never been inspected.
 */
export const mockCheckout = (
  overrides: MockCheckoutOverrides,
): RepositoryCheckout => {
  const {
    branch = null,
    displayName = overrides.id,
    filesystemPath = `/Users/dev/Development/${overrides.id}`,
    foreignSkillInjectionEnabled = false,
    id,
    kind = 'primary',
    managed = false,
    repositoryId = 'repo-1',
    updatedAt = '2026-07-24T00:00:00.000Z',
  } = overrides;

  return {
    createdAt: '2026-07-24T00:00:00.000Z',
    displayName,
    filesystemPath,
    foreignSkillInjectionEnabled,
    id,
    inspection: branch
      ? {
          agentConfig: {
            agentsMd: false,
            claudeMd: false,
            cursorRules: false,
            mcpJson: false,
            skillsDir: false,
          },
          git: {
            currentBranch: branch,
            defaultBranch: branch,
            dirty: false,
            isRepo: true,
            linkedWorktrees: [],
            normalizedRemoteUrl: null,
          },
          scannedAt: '2026-07-24T00:00:00.000Z',
          stack: {
            languages: [],
            nxWorkspace: false,
            packageManager: null,
            pnpmWorkspace: false,
            turbo: false,
          },
          warnings: [],
        }
      : null,
    kind,
    managed,
    repositoryId,
    scannedAt: '2026-07-24T00:00:00.000Z',
    updatedAt,
    userId: 'user-1',
  };
};

/** @description Minimal workspace-repository fixture for the row-model specs. */
export const mockRepository = (
  overrides: MockRepositoryOverrides,
): WorkspaceRepositoryFieldsFragment => {
  const {
    checkouts = [],
    defaultBranch = 'main',
    id,
    name = overrides.id,
    normalizedRemoteUrl = `https://github.com/OpenThrottle/${overrides.id}`,
    updatedAt = '2026-07-24T00:00:00.000Z',
  } = overrides;

  return {
    checkouts,
    createdAt: '2026-07-24T00:00:00.000Z',
    defaultBranch,
    id,
    name,
    normalizedRemoteUrl,
    projectId: null,
    updatedAt,
  };
};

/**
 * @description Minimal on-disk worktree fixture for the row-model and table specs.
 * Defaults model the common case: an UNREGISTERED idle worktree belonging to
 * `repo-1`. Pass `checkoutId` to model one OpenThrottle already knows about.
 */
export const mockDiscoveredWorktree = (
  overrides: MockDiscoveredWorktreeOverrides,
): DiscoveredWorktree => {
  const {
    activity = WorktreeActivity.Idle,
    branch = `openthrottle/${overrides.name}`,
    checkoutId = null,
    name,
    path = `/Users/dev/Development/openthrottle-worktrees/${overrides.name}`,
    planId = null,
    planRunId = null,
    repositoryId = 'repo-1',
    unregistered = checkoutId == null,
  } = overrides;

  return {
    activity,
    branch,
    checkoutId,
    name,
    path,
    planId,
    planRunId,
    repositoryId,
    unregistered,
  };
};

/**
 * @description Minimal worktree-scan payload fixture. Defaults model a clean scan of
 * the default root with nothing found; pass `worktreeRoot: null` to model the
 * "no root to scan" state and `problems` to model a partial scan.
 */
export const mockDiscoveredWorktrees = (
  overrides: Partial<DiscoveredWorktreesResult> = {},
): DiscoveredWorktreesResult => ({
  droppedCount: 0,
  problems: [],
  rootSource: WorktreeRootSource.Default,
  scannedAt: '2026-08-24T00:00:00.000Z',
  scannedRoots: [],
  worktreeRoot: '/Users/dev/.openthrottle/worktrees/monorepo',
  worktrees: [],
  ...overrides,
});
