/**
 * @description Script-side trigger for `~/.openthrottle/.env`, the user-global
 * file through which agents in foreign checkouts reach OpenThrottle. The only
 * writer stays `ensureUserEnvEntries` from `@openthrottle/agentic-hooks` (managed
 * lines only; a user-set key is never touched). This module adds the scripts'
 * skip rules and the log lines, so `database:bootstrap-service-accounts` (and
 * through it `./scripts/setup.sh`) and the manual `pnpm run user-env:write`
 * behave the same way.
 *
 * Skipped in a linked worktree (or under `OT_WORKTREE_DB`): its server and
 * isolated database disappear with the worktree, so every other checkout would
 * end up pointing at nothing. Never prints the token.
 */
import type {
  EnsureUserEnvEntriesResult,
  UserEnvEntries,
} from '@openthrottle/agentic-hooks';
import { graphqlUrlFromEnvMap } from '@openthrottle/agentic-hooks';

import type { Logger } from './logger.ts';

/** Where a local primary server answers when nothing else says otherwise. */
export const DEFAULT_LOCAL_GRAPHQL_URL = 'http://127.0.0.1:6021/graphql';

/** Why a script did not write the file. */
export const USER_ENV_SCRIPT_SKIP_REASONS = Object.freeze({
  NO_TOKEN: 'no_token',
  WORKTREE: 'worktree',
} as const);

export type UserEnvScriptSkipReason =
  (typeof USER_ENV_SCRIPT_SKIP_REASONS)[keyof typeof USER_ENV_SCRIPT_SKIP_REASONS];

interface UserEnvScriptSkipped {
  readonly kind: 'skipped';
  readonly reason: UserEnvScriptSkipReason;
}

interface UserEnvScriptRan {
  readonly kind: 'ran';
  readonly result: EnsureUserEnvEntriesResult;
}

export type UserEnvScriptOutcome = UserEnvScriptRan | UserEnvScriptSkipped;

export interface SyncUserEnvFileParams {
  readonly authToken: string | undefined;
  /** `OPENTHROTTLE_USER_CONFIG_DIR` when set; `undefined` means `~/.openthrottle`. */
  readonly configDir: string | undefined;
  readonly ensure: (
    entries: UserEnvEntries,
    configDir?: string,
  ) => EnsureUserEnvEntriesResult;
  readonly graphqlUrl: string;
  readonly isWorktree: boolean;
  readonly logger: Logger;
}

/**
 * The endpoint a script should write: an explicit `OPENTHROTTLE_*` URL from the
 * environment it runs in (the root `.env` sets `OPENTHROTTLE_SERVER_APP_URL`),
 * else the local primary server's default.
 */
export const resolveScriptGraphqlUrl = (
  env: Record<string, string | undefined>,
): string => {
  return graphqlUrlFromEnvMap(env) ?? DEFAULT_LOCAL_GRAPHQL_URL;
};

/** Run the writer under the script skip rules and log what happened. Never throws. */
export const syncUserEnvFile = ({
  authToken,
  configDir,
  ensure,
  graphqlUrl,
  isWorktree,
  logger,
}: SyncUserEnvFileParams): UserEnvScriptOutcome => {
  if (isWorktree) {
    logger.detail('~/.openthrottle/.env left alone: this is a linked worktree, and its server goes away with it.'); // prettier-ignore
    return { kind: 'skipped', reason: USER_ENV_SCRIPT_SKIP_REASONS.WORKTREE };
  }

  const token = authToken?.trim() ?? '';
  if (token === '') {
    logger.warn('~/.openthrottle/.env not written: no OPENTHROTTLE_MCP_AUTH_TOKEN to write, so agents in other checkouts cannot reach OpenThrottle.'); // prettier-ignore
    return { kind: 'skipped', reason: USER_ENV_SCRIPT_SKIP_REASONS.NO_TOKEN };
  }

  const result = ensure({ authToken: token, graphqlUrl }, configDir);
  if (!result.ok) {
    logger.warn(`Could not update ${result.envPath} (${result.error}).`);
  } else if (result.changed) {
    logger.success(`Updated ${result.envPath} (endpoint: ${result.endpoint}, token: ${result.token})`); // prettier-ignore
  } else {
    logger.detail(`${result.envPath} already current (endpoint: ${result.endpoint}, token: ${result.token})`); // prettier-ignore
  }
  return { kind: 'ran', result };
};

/** The config dir override the server honours too, or `undefined`. */
export const resolveScriptConfigDir = (
  env: Record<string, string | undefined>,
): string | undefined => {
  const dir = (env.OPENTHROTTLE_USER_CONFIG_DIR ?? '').trim();
  return dir === '' ? undefined : dir;
};

/** True when the process runs for a worktree (its checkout or its isolated DB). */
export const isWorktreeContext = (
  env: Record<string, string | undefined>,
  isLinkedWorktree: () => boolean,
): boolean => {
  return (env.OT_WORKTREE_DB ?? '').trim() !== '' || isLinkedWorktree();
};
