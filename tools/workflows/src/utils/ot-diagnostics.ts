import { sanitizePostgresUrlForLogs } from '@openthrottle/openthrottle-agentic-utils';

import { loadWorkflowRalphConfig } from '../config/load-workflow-ralph-config.ts';

/**
 * @description Opt-in diagnostics for comparing OpenThrottle DB/API identity across BullMQ worker → nested `workflow-ralph` when using `workingDirectory`. Never logs passwords.
 */

/** When set on `workflow-ralph`, emits one stderr JSON line before plan lookup. */
export const WORKFLOW_RALPH_OT_DIAGNOSTICS_ENV = `WORKFLOW_RALPH_OT_DIAGNOSTICS`;

/** When set on openthrottle-server (worker), logs spawn cwd + worker Postgres identity before `pnpm exec workflow-ralph`. */
export const OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV = `OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS`;

const OT_DIAGNOSTICS_LOG_PREFIX = `[workflow-ralph:ot-diagnostics]`;
const PLANS_SPAWN_DIAGNOSTICS_PREFIX = `[plans-spawn:ot-diagnostics]`;

/**
 * @description One stderr line with cwd, plan id, sanitized Postgres target, and booleans for related env (no token values).
 */
export function logWorkflowRalphOtDiagnostics(params: {
  readonly connectionString?: string;
  readonly planId: string;
}): void {
  const diagnosticsEnabled = loadWorkflowRalphConfig(process.cwd()).diagnostics
    .ot;

  if (diagnosticsEnabled !== true) {
    return;
  }

  const env = process.env;
  const payload = {
    apiUrlExternalSet: Boolean(env.API_URL_EXTERNAL?.trim()),
    apiUrlInternalSet: Boolean(env.API_URL_INTERNAL?.trim()),
    cwd: process.cwd(),
    envHints: {
      anthropicApiKeySet: Boolean(env.ANTHROPIC_API_KEY?.trim()),
      authJwtSecretSet: Boolean(env.AUTH_JWT_SECRET?.trim()),
      githubTokenSet: Boolean(env.GITHUB_TOKEN?.trim()),
      graphqlUrlSet: Boolean(env.GRAPHQL_URL?.trim()),
      jwtSecretSet: Boolean(env.JWT_SECRET?.trim()),
      openthrottlePostgresUrlSet: Boolean(
        env.OPENTHROTTLE_POSTGRES_URL?.trim(),
      ),
      openthrottleWorkflowsAuthTokenSet: Boolean(
        env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN?.trim(),
      ),
      openthrottleWorkflowsGraphqlUrlSet: Boolean(
        env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL?.trim(),
      ),
      postgresqlStarVarsPartiallySet: Boolean(
        env.POSTGRES_HOST?.trim() || env.POSTGRES_DB?.trim(),
      ),
      postgresqlUrlSet: Boolean(env.POSTGRES_URL?.trim()),
      spawnHomeOverrideSet: Boolean(env.WORKFLOW_RALPH_SPAWN_HOME?.trim()),
      spawnXdgConfigHomeOverrideSet: Boolean(
        env.WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME?.trim(),
      ),
      workflowRalphTransport: env.WORKFLOW_RALPH_TRANSPORT?.trim() ?? 'graphql',
      workspaceRootEnvSet: Boolean(env.WORKSPACE_ROOT?.trim()),
    },
    home: env.HOME ?? '(unset)',
    note: 'workflow-ralph resolves plans via GraphQL by default (executeWorkflowGraphqlV2 + codegen documents). Set WORKFLOW_RALPH_TRANSPORT=postgres-direct to use direct Postgres (getPostgresConfig → getPlanById). Developer app GraphQL/API_URL_* must match the server Ralph calls. BullMQ spawns inject OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN / OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL from the worker so a foreign cwd cannot override OpenThrottle transport; mismatched auth vs the server where the plan row exists yields Plan not found.',
    planId: params.planId,
    postgresIdentity:
      params.connectionString != null && params.connectionString !== ''
        ? sanitizePostgresUrlForLogs(params.connectionString)
        : '(graphql transport — no POSTGRES_URL on client)',
    surface: 'workflow-ralph',
    unixUser: env.USER ?? env.LOGNAME ?? '(unset)',
  };

  console.error(OT_DIAGNOSTICS_LOG_PREFIX, JSON.stringify(payload));
}

interface PlansProcessorSpawnOtDiagnosticsParams {
  readonly jobId: string;
  readonly planId: string;
  readonly queueLabel: string;
  readonly spawnCwd: string;
  readonly workerEnv: NodeJS.ProcessEnv;
}

/**
 * @description Single-line JSON message for Nest `LoggerService`, or null when diagnostics are disabled.
 */
export function formatPlansProcessorSpawnOtDiagnosticsMessage(
  params: PlansProcessorSpawnOtDiagnosticsParams,
): string | null {
  const config = loadWorkflowRalphConfig(params.spawnCwd, params.workerEnv);

  if (config.diagnostics.spawn !== true) {
    return null;
  }

  const env = params.workerEnv;
  const pgUrl = env.POSTGRES_URL?.trim();
  const postgresIdentity = pgUrl
    ? sanitizePostgresUrlForLogs(pgUrl)
    : `POSTGRES_* host=${env.POSTGRES_HOST ?? '(unset)'} db=${env.POSTGRES_DB ?? '(unset)'}`;

  const effectiveUnixUid =
    typeof process.getuid === 'function' ? process.getuid() : null;

  const payload = {
    envPresence: {
      anthropicApiKeySet: Boolean(env.ANTHROPIC_API_KEY?.trim()),
      apiUrlExternalSet: Boolean(env.API_URL_EXTERNAL?.trim()),
      apiUrlInternalSet: Boolean(env.API_URL_INTERNAL?.trim()),
      githubTokenSet: Boolean(env.GITHUB_TOKEN?.trim()),
      graphqlUrlSet: Boolean(env.GRAPHQL_URL?.trim()),
      jwtSecretSet: Boolean(env.JWT_SECRET?.trim()),
      postgresqlUrlSet: Boolean(pgUrl),
      spawnHomeOverrideSet: Boolean(env.WORKFLOW_RALPH_SPAWN_HOME?.trim()),
      spawnXdgConfigHomeOverrideSet: Boolean(
        env.WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME?.trim(),
      ),
    },
    home: env.HOME ?? '(unset)',
    jobId: params.jobId,
    planId: params.planId,
    postgresIdentity,
    queueLabel: params.queueLabel,
    spawnCwd: params.spawnCwd,
    surface: 'bullmq-worker-pre-spawn',
    unixUser: env.USER ?? env.LOGNAME ?? '(unset)',
    workerEffectiveUnixUid: effectiveUnixUid,
    workerPid: process.pid,
    workspaceRootEnv: env.WORKSPACE_ROOT ?? '(unset)',
  };

  return `${PLANS_SPAWN_DIAGNOSTICS_PREFIX} ${JSON.stringify(payload)}`;
}
