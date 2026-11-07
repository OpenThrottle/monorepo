/**
 * The parts of {@link BashGuardContext} that describe the machine rather than
 * the command: platform, login shell, and how to ask the filesystem whether a
 * glob matches. Adapters spread {@link readShellEnvironment} into the context
 * they hand the registry.
 *
 * @public
 */
import path from 'node:path';

import type { BashGuardContext, GlobMatcher } from './types.ts';

/**
 * A matcher that always answers "matches", so every rule asking it allows.
 *
 * @public
 */
export const FAIL_OPEN_GLOB_MATCHER: GlobMatcher = async () => {
  return true;
};

/**
 * The login shell's basename from a `SHELL` value (`/bin/zsh` → `zsh`), or
 * null when it is unset or blank.
 *
 * @public
 */
export const readShellName = (shell: string | undefined): string | null => {
  const trimmed = shell?.trim() ?? '';
  return trimmed === '' ? null : path.basename(trimmed);
};

/** @public */
export interface ReadShellEnvironmentOptions {
  readonly env: NodeJS.ProcessEnv;
  readonly globMatches: GlobMatcher;
  readonly platform: string;
}

/**
 * Platform, shell and glob matcher for a guard context.
 *
 * @public
 */
export const readShellEnvironment = (
  options: ReadShellEnvironmentOptions,
): Pick<BashGuardContext, 'globMatches' | 'platform' | 'shell'> => {
  return {
    globMatches: options.globMatches,
    platform: options.platform,
    shell: readShellName(options.env.SHELL),
  };
};
