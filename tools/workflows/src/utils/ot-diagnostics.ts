/**
 * @description Opt-in diagnostics for comparing OpenThrottle DB/API identity across BullMQ worker → nested `workflow-ralph` when using `workingDirectory`. Never logs passwords.
 */

/** When set on `workflow-ralph`, emits one stderr JSON line before plan lookup. */
export const WORKFLOW_RALPH_OT_DIAGNOSTICS_ENV =
  'WORKFLOW_RALPH_OT_DIAGNOSTICS' as const;

/** When set on openthrottle-server (worker), logs spawn cwd + worker Postgres identity before `pnpm exec workflow-ralph`. */
export const OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV =
  'OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS' as const;

const OT_DIAGNOSTICS_LOG_PREFIX = '[workflow-ralph:ot-diagnostics]' as const;
const PLANS_SPAWN_DIAGNOSTICS_PREFIX = '[plans-spawn:ot-diagnostics]' as const;

/**
 * @description True when `value` is a non-empty string after trim (common env toggles: `1`, `true`).
 */
export function isOtDiagnosticsEnvTruthy(value: string | undefined): boolean {
  if (value === undefined || value === '') {
    return false;
  }

  const s = value.trim().toLowerCase();

  return !(s === '' || s === '0' || s === 'false' || s === 'off' || s === 'no');
}

/**
 * @description Returns a Postgres URL safe for logs (password stripped). Falls back if parsing fails.
 */
export function sanitizePostgresConnectionForLogs(
  connectionString: string,
): string {
  try {
    const u = new URL(connectionString);
    u.password = '';

    return u.toString();
  } catch {
    return '(unparseable POSTGRES_URL)';
  }
}

/**
 * @description One stderr line with cwd, plan id, sanitized Postgres target, and booleans for related env (no token values).
 */
export function logWorkflowRalphOtDiagnostics(params: {
  readonly planId: string;
  readonly connectionString: string;
}): void {
  const raw = process.env[WORKFLOW_RALPH_OT_DIAGNOSTICS_ENV];

  if (!isOtDiagnosticsEnvTruthy(raw)) {
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
      openthrottleCortexPostgresUrlSet: Boolean(
        env.OPENTHROTTLE_CORTEX_POSTGRES_URL?.trim(),
      ),
      postgresqlStarVarsPartiallySet: Boolean(
        env.POSTGRES_HOST?.trim() || env.POSTGRES_DB?.trim(),
      ),
      postgresqlUrlSet: Boolean(env.POSTGRES_URL?.trim()),
      workspaceRootEnvSet: Boolean(env.WORKSPACE_ROOT?.trim()),
    },
    home: env.HOME ?? '(unset)',
    note: 'workflow-ralph resolves plans via direct Postgres (getPostgresConfig → getPlanById), not GraphQL. Developer app GraphQL/API_URL_* does not affect plan lookup. BullMQ spawns inject OPENTHROTTLE_CORTEX_POSTGRES_URL / POSTGRES_URL from the worker so a foreign cwd cannot override Cortex DB; mismatched POSTGRES_* vs the DB where the plan row exists yields Plan not found.',
    planId: params.planId,
    postgresIdentity: sanitizePostgresConnectionForLogs(
      params.connectionString,
    ),
    surface: 'workflow-ralph',
    unixUser: env.USER ?? env.LOGNAME ?? '(unset)',
  };

  console.error(OT_DIAGNOSTICS_LOG_PREFIX, JSON.stringify(payload));
}

export interface PlansProcessorSpawnOtDiagnosticsParams {
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
  const raw = params.workerEnv[OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV];

  if (!isOtDiagnosticsEnvTruthy(raw)) {
    return null;
  }

  const env = params.workerEnv;
  const pgUrl = env.POSTGRES_URL?.trim();
  const postgresIdentity = pgUrl
    ? sanitizePostgresConnectionForLogs(pgUrl)
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
