/**
 * @description Keeps `~/.openthrottle/.env` pointing at this server, which is how
 * agents in every checkout on this machine (skill-usage telemetry, the plan
 * hooks) reach OpenThrottle without the user pasting a line anywhere. Since the
 * agent child env is allowlisted (#966), it is the ONLY way an agent in a
 * foreign checkout finds OT. The primary local server
 * fills in `~/.openthrottle/.env` with its own loopback GraphQL URL and the MCP
 * machine token, through the fill-in writer in `@openthrottle/agentic-hooks`
 * (managed lines only; a user-set key is never touched).
 *
 * Skipped on a worktree server (it would point every repo at a server that
 * disappears with the worktree) and in a container whose home is not the host's.
 * Runs at boot and whenever an admin mints an `openthrottle-mcp` credential
 * (`UserEnvFileService`), which also grades the file for `serverHealth.userEnvFile`
 * and the boot warning. Never fails the caller: one line when it writes, one
 * warning when it cannot, silence when the file is already current. Every
 * trigger, skip rule and health status:
 * docs/monorepo/child-repo-hook-telemetry-contract.md § Who writes `~/.openthrottle/.env`.
 *
 * Why the MCP token rather than a narrower credential: `ot_sa` credentials carry no
 * scope, and a role-less service account still passes every authenticated-only
 * resolver, so a "skill-usage only" credential would not actually be narrower.
 */
import type {
  InspectUserEnvEntriesResult,
  UserEnvConcernState,
} from '@openthrottle/agentic-hooks';
import { normalizeLoopbackHost } from '@openthrottle/agentic-hooks';
import { toErrorMessage } from '@openthrottle/nodejs-utils';

import {
  USER_ENV_FILE_CONFIG_DIR_ENV,
  USER_ENV_FILE_CONTAINER_MARKERS,
  USER_ENV_FILE_HEALTH,
  USER_ENV_FILE_SKIP_REASONS,
} from './user-env-file.constants.ts';
import type {
  AssessUserEnvFileParams,
  EnsureUserEnvFileParams,
  ResolveUserEnvFilePlanParams,
  ResolveUserEnvFileScopeParams,
  UserEnvFileHealth,
  UserEnvFileHealthStatus,
  UserEnvFilePlan,
  UserEnvFileScope,
} from './user-env-file.types.ts';

const readTrimmed = (
  env: NodeJS.ProcessEnv,
  key: string,
): string | undefined => {
  const value = env[key]?.trim();
  return value === '' ? undefined : value;
};

/**
 * Decide whether this server owns the user env file at all, and if so where it
 * lives and which endpoint belongs in it. Shared by the writer and the health
 * check, so they cannot disagree about when the file is this server's business.
 * Pure: every input is a parameter.
 */
export const resolveUserEnvFileScope = ({
  env,
  fileExists,
  port,
}: ResolveUserEnvFileScopeParams): UserEnvFileScope => {
  if (readTrimmed(env, 'OT_WORKTREE_DB') !== undefined) {
    return { kind: 'skip', reason: USER_ENV_FILE_SKIP_REASONS.WORKTREE };
  }

  const configDir = readTrimmed(env, USER_ENV_FILE_CONFIG_DIR_ENV);
  const inContainer = USER_ENV_FILE_CONTAINER_MARKERS.some((marker) => {
    return fileExists(marker);
  });
  if (configDir === undefined && inContainer) {
    return { kind: 'skip', reason: USER_ENV_FILE_SKIP_REASONS.CONTAINER };
  }

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return { kind: 'skip', reason: USER_ENV_FILE_SKIP_REASONS.NO_PORT };
  }

  return {
    configDir,
    graphqlUrl: `http://127.0.0.1:${port}/graphql`,
    kind: 'applicable',
  };
};

/**
 * Decide whether this process should write the user env file, and with what.
 * Pure: every input is a parameter.
 */
export const resolveUserEnvFilePlan = ({
  env,
  fileExists,
  port,
  tokenOverride,
}: ResolveUserEnvFilePlanParams): UserEnvFilePlan => {
  const scope = resolveUserEnvFileScope({ env, fileExists, port });
  if (scope.kind === 'skip') {
    return scope;
  }

  const override = tokenOverride?.trim();
  const authToken = override || readTrimmed(env, 'OPENTHROTTLE_MCP_AUTH_TOKEN');
  if (authToken === undefined) {
    return { kind: 'skip', reason: USER_ENV_FILE_SKIP_REASONS.NO_TOKEN };
  }

  return {
    configDir: scope.configDir,
    entries: { authToken, graphqlUrl: scope.graphqlUrl },
    kind: 'write',
  };
};

const gradeEndpoint = (
  state: UserEnvConcernState,
  graphqlUrl: string,
): UserEnvFileHealthStatus => {
  if (state.kind === 'missing') {
    return USER_ENV_FILE_HEALTH.MISSING;
  }
  if (state.kind === 'user_set') {
    return USER_ENV_FILE_HEALTH.USER_SET;
  }
  const current = normalizeLoopbackHost(state.value.replace(/\/$/, ''));
  return current === graphqlUrl
    ? USER_ENV_FILE_HEALTH.OK
    : USER_ENV_FILE_HEALTH.STALE;
};

const gradeToken = (
  state: UserEnvConcernState,
  tokenActive: boolean,
): UserEnvFileHealthStatus => {
  if (state.kind === 'missing') {
    return USER_ENV_FILE_HEALTH.MISSING;
  }
  if (!tokenActive) {
    return USER_ENV_FILE_HEALTH.STALE;
  }
  return state.kind === 'user_set'
    ? USER_ENV_FILE_HEALTH.USER_SET
    : USER_ENV_FILE_HEALTH.OK;
};

/**
 * Grade what the file holds against this server, per concern. Pure: the file
 * inspection and the token check are inputs. `user_set` is reported as-is for
 * an endpoint (the user chose it); a token is checked whoever set it, because a
 * revoked token breaks agents either way.
 */
export const assessUserEnvFile = ({
  graphqlUrl,
  inspection,
  tokenActive,
}: AssessUserEnvFileParams): UserEnvFileHealth => {
  if (!inspection.ok) {
    return {
      endpoint: USER_ENV_FILE_HEALTH.UNREADABLE,
      token: USER_ENV_FILE_HEALTH.UNREADABLE,
    };
  }

  return {
    endpoint: gradeEndpoint(inspection.endpoint, graphqlUrl),
    token: gradeToken(inspection.token, tokenActive),
  };
};

/** The token the file holds, whoever set it, or `undefined`. Never log it. */
export const readInspectedToken = (
  inspection: InspectUserEnvEntriesResult,
): string | undefined => {
  if (!inspection.ok || inspection.token.kind === 'missing') {
    return undefined;
  }
  return inspection.token.value;
};

/** True when a status means agents in other checkouts cannot reach this server. */
export const isUserEnvFileUnhealthy = (
  status: UserEnvFileHealthStatus,
): boolean => {
  return (
    status === USER_ENV_FILE_HEALTH.MISSING ||
    status === USER_ENV_FILE_HEALTH.STALE ||
    status === USER_ENV_FILE_HEALTH.UNREADABLE
  );
};

/**
 * Run the writer for this server: at boot, and again when an MCP credential is
 * minted while it runs. Never throws, never blocks: the writer is synchronous
 * and fail-open, and anything unexpected becomes one warning.
 */
export const ensureUserEnvFile = ({
  ensure,
  env,
  fileExists,
  logger,
  port,
  tokenOverride,
}: EnsureUserEnvFileParams): void => {
  try {
    const plan = resolveUserEnvFilePlan({
      env,
      fileExists,
      port,
      tokenOverride,
    });

    if (plan.kind === 'skip') {
      if (plan.reason === USER_ENV_FILE_SKIP_REASONS.NO_TOKEN) {
        logger.warn(
          `~/.openthrottle/.env not written: OPENTHROTTLE_MCP_AUTH_TOKEN is not set for this server, so agents in other checkouts cannot reach it`,
        );
      }
      return;
    }

    const result = ensure(plan.entries, plan.configDir);
    if (!result.ok) {
      logger.warn(
        `Could not update ${result.envPath} (${result.error}); agents in other checkouts may not reach this server`,
      );
      return;
    }
    if (result.changed) {
      logger.info(
        `Updated ${result.envPath} so agents in every checkout on this machine reach this server (endpoint: ${result.endpoint}, token: ${result.token})`,
      );
    }
  } catch (err) {
    const message = toErrorMessage(err);
    logger.warn(`Could not update ~/.openthrottle/.env: ${message}`);
  }
};
