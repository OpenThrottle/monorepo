/**
 * @description Boot step that makes skill-usage telemetry work in every checkout on
 * this machine without the user pasting a line anywhere: the primary local server
 * fills in `~/.openthrottle/.env` with its own loopback GraphQL URL and a
 * telemetry-only machine token, through the fill-in writer in
 * `@openthrottle/agentic-hooks` (managed lines only; a user-set key is never touched).
 *
 * Skipped on a worktree server (it would point every repo at a server that
 * disappears with the worktree) and in a container whose home is not the host's.
 * Never fails boot: one line when it writes, one warning when it cannot, silence
 * when the file is already current.
 *
 * The token is not `OPENTHROTTLE_MCP_AUTH_TOKEN` itself but a child derived from it
 * and provisioned with the `telemetry:ingest` scope, so the copy left in a file
 * every checkout reads reaches only the ingest mutations the telemetry hooks send.
 * A file written before scopes existed holds the all-access token in a managed
 * line; the next boot refreshes it. If the child cannot be provisioned, nothing is
 * written: falling back to the all-access token would undo the point.
 */
import {
  USER_ENV_FILE_CONFIG_DIR_ENV,
  USER_ENV_FILE_CONTAINER_MARKERS,
  USER_ENV_FILE_SKIP_REASONS,
  USER_ENV_FILE_TOKEN_ACCOUNT,
} from './user-env-file.constants.ts';
import type {
  EnsureUserEnvFileOnBootParams,
  ProvisionTelemetryIngestTokenParams,
  ProvisionTelemetryTokenResult,
  ResolveUserEnvFilePlanParams,
  UserEnvFilePlan,
} from './user-env-file.types.ts';

const readTrimmed = (
  env: NodeJS.ProcessEnv,
  key: string,
): string | undefined => {
  const value = env[key]?.trim();
  return value === '' ? undefined : value;
};

/**
 * Decide whether this process should write the user env file, and with what.
 * Pure: every input is a parameter.
 */
export const resolveUserEnvFilePlan = ({
  env,
  fileExists,
  port,
}: ResolveUserEnvFilePlanParams): UserEnvFilePlan => {
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

  const authToken = readTrimmed(env, 'OPENTHROTTLE_MCP_AUTH_TOKEN');
  if (authToken === undefined) {
    return { kind: 'skip', reason: USER_ENV_FILE_SKIP_REASONS.NO_TOKEN };
  }

  return {
    configDir,
    graphqlUrl: `http://127.0.0.1:${port}/graphql`,
    kind: 'write',
    parentToken: authToken,
  };
};

/**
 * Upsert the `telemetry:ingest` credential derived from `parentToken` on the
 * `openthrottle-mcp` account, which owns the MCP token and acts as the user, so
 * ingest stays attributed. Idempotent: a no-op once the row matches.
 */
export const provisionTelemetryIngestToken = async ({
  credentials,
  parentToken,
  serviceAccounts,
}: ProvisionTelemetryIngestTokenParams): Promise<ProvisionTelemetryTokenResult> => {
  const account = await serviceAccounts.findByName(USER_ENV_FILE_TOKEN_ACCOUNT);
  if (account == null) {
    return {
      kind: 'failed',
      reason: `no ${USER_ENV_FILE_TOKEN_ACCOUNT} service account`,
    };
  }

  const result = await credentials.upsertTelemetryIngestCredential({
    parentToken,
    serviceAccountId: account.id,
  });
  if (result == null) {
    return {
      kind: 'failed',
      reason: `${USER_ENV_FILE_TOKEN_ACCOUNT} is disabled`,
    };
  }

  return { kind: 'provisioned', token: result.token };
};

/**
 * Run the boot step. Never throws: provisioning and the writer are fail-open,
 * and anything unexpected becomes one warning.
 */
export const ensureUserEnvFileOnBoot = async ({
  ensure,
  env,
  fileExists,
  logger,
  port,
  provisionTelemetryToken,
}: EnsureUserEnvFileOnBootParams): Promise<void> => {
  try {
    const plan = resolveUserEnvFilePlan({ env, fileExists, port });

    if (plan.kind === 'skip') {
      if (plan.reason === USER_ENV_FILE_SKIP_REASONS.NO_TOKEN) {
        logger.warn(
          `~/.openthrottle/.env not written: OPENTHROTTLE_MCP_AUTH_TOKEN is not set for this server, so other checkouts will buffer skill usage locally`,
        );
      }
      return;
    }

    const provisioned = await provisionTelemetryToken(plan.parentToken);
    if (provisioned.kind === 'failed') {
      logger.warn(
        `~/.openthrottle/.env not written: the telemetry-only credential could not be provisioned (${provisioned.reason}); skill usage from other checkouts will buffer locally`,
      );
      return;
    }

    const result = ensure(
      { authToken: provisioned.token, graphqlUrl: plan.graphqlUrl },
      plan.configDir,
    );
    if (!result.ok) {
      logger.warn(
        `Could not update ${result.envPath} (${result.error}); skill usage from other checkouts will buffer locally`,
      );
      return;
    }
    if (result.changed) {
      logger.info(
        `Updated ${result.envPath} so every checkout on this machine records skill usage (endpoint: ${result.endpoint}, token: ${result.token})`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Could not update ~/.openthrottle/.env: ${message}`);
  }
};
