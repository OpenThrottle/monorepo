import { isAbsolute } from 'node:path';

import { toContainerPath } from '@openthrottle/openthrottle-agentic-utils';

import { expandHome } from '../../../services/paths/expand-home/expand-home.utils.ts';
import {
  CHECKOUT_ROOT_ENV,
  WORKSPACE_ROOTS_ENV,
} from './workspace-folders.constants.ts';
/**
 * Workspace roots in this process's view. Empty when unset — proactive
 * discovery is opt-in, unlike targeted enqueue validation (design doc §6).
 */
export const getWorkspaceRoots = (
  env: NodeJS.ProcessEnv = process.env,
): readonly string[] => {
  const raw = env[WORKSPACE_ROOTS_ENV];
  if (!raw || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((path) => toContainerPath(path.trim(), env))
    .filter((path) => path.length > 0 && isAbsolute(path));
};

/**
 * @description Owner/repo name from a normalized remote URL — the last two
 * non-empty path segments joined by `/` (e.g. `github.com/acme/monorepo` →
 * `acme/monorepo`), so repos that share a bare last segment stay
 * distinguishable. Falls back to the single segment when only one exists.
 */
export const repositoryNameFromRemote = (
  normalizedRemoteUrl: string,
): string | null => {
  const segments = normalizedRemoteUrl.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  return segments.slice(-2).join('/');
};

/**
 * @description Configured managed-checkout root in the host view, or null when
 * OPENTHROTTLE_CHECKOUT_ROOT is unset/blank/non-absolute (clone is then disabled).
 *
 * A leading `~` is expanded first. This value is written by hand in a `.env` file, where `~` is the
 * natural way to say "my home" — and `.env.default` documents exactly that. Without expansion
 * `isAbsolute('~/OpenThrottle/repositories')` is false, so the documented value returned null and
 * silently disabled cloning. Matches OPENTHROTTLE_WORKTREE_ROOT, which expands the same way.
 */
export const getCheckoutRoot = (
  env: NodeJS.ProcessEnv = process.env,
): string | null => {
  const raw = env[CHECKOUT_ROOT_ENV];
  if (raw == null) return null;
  const expanded = expandHome(raw.trim());
  return expanded !== '' && isAbsolute(expanded) ? expanded : null;
};

/**
 * @description Owner/repo name from a raw git URL (`.git` stripped) — the last
 * two non-empty segments joined by `/`, matching repositoryNameFromRemote so
 * the clone fallback name is org-disambiguated too. Single segment when only
 * one exists.
 */
export const repositoryNameFromGitUrl = (gitUrl: string): string | null => {
  const withoutSuffix = gitUrl.trim().replace(/\.git\/?$/, '');
  const segments = withoutSuffix.split(/[/:]/).filter(Boolean);
  if (segments.length === 0) return null;
  return segments.slice(-2).join('/');
};
