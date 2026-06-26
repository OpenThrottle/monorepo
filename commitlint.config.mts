import nxScopes from '@commitlint/config-nx-scopes';
import type {
  RuleConfigCondition,
  RuleConfigSeverity,
  UserConfig,
} from '@commitlint/types';

/**
 * `@commitlint/config-nx-scopes` ships no type declarations, so describe the
 * single util we consume. `getProjects` resolves the workspace's Nx project
 * names, which we use as the allowed commit scopes.
 */
interface NxScopesUtils {
  getProjects: (context: { cwd?: string }) => Promise<string[]> | string[];
}

const { getProjects }: NxScopesUtils = nxScopes.utils;

// Valid scopes that are not Nx projects (workflow / automation scopes).
const customScopes = ['ci', 'release'];

const error: RuleConfigSeverity.Error = 2;
const always: RuleConfigCondition = 'always';

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional', '@commitlint/config-nx-scopes'],
  rules: {
    'scope-enum': async (
      context,
    ): Promise<[RuleConfigSeverity, RuleConfigCondition, string[]]> => [
      error,
      always,
      [...(await getProjects(context ?? {})), ...customScopes],
    ],
  },
};

export default Configuration;
