import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import type { RepositoryCheckout } from '~/routing/settings/repositories/data/types';

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
