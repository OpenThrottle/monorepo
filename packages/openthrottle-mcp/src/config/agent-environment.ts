/**
 * @description Which agent environment (`ci | interactive | ralph`) this MCP server runs in,
 * detected ONCE at stdio startup and sent on every mutating tool call as `X-OT-Environment`, so
 * the plan-rules evaluation a mutation triggers carries the environment and an
 * environment-qualified tag→action rule can fire from it.
 *
 * Same surface split as `./execution-backend.ts`: only {@link runServerLocal} captures. On the
 * Nest/HTTP surface this code runs inside the OpenThrottle server, whose environment describes the
 * server and not the caller, so it captures nothing and sends no header.
 *
 * The header is a claim, not a proof: it only selects which of the plan owner's own rules apply to
 * the pass, so a wrong value misconfigures nothing beyond that pass. That is why it may be inferred
 * from the launch environment at all; it is also why each rung below only ever names an
 * environment it has a positive signal for.
 */

/** The environments plan rules accept, mirroring `SKILL_AVAILABILITY_ENVIRONMENTS`. */
export type AgentEnvironment = 'ci' | 'interactive' | 'ralph';

const AGENT_ENVIRONMENTS: readonly AgentEnvironment[] = [
  'ci',
  'interactive',
  'ralph',
];

/** Request header the server's global CLS setup reads (`x-ot-environment`). */
export const AGENT_ENVIRONMENT_HEADER = 'X-OT-Environment';

/**
 * Env var an orchestrator sets on the agent CLI it spawns (`RUN_IDENTITY_ENV.planId` in
 * `@openthrottle/openthrottle-agentic-utils`). Read by name rather than imported, so the MCP's
 * startup does not evaluate that package's whole entry point for one string.
 */
const RUN_IDENTITY_PLAN_ID_ENV = 'OPENTHROTTLE_PLAN_ID';

/** Harness markers, the same set `./execution-backend.ts` detects a backend from. */
const AGENT_HARNESS_ENV_MARKERS: readonly string[] = [
  'ANTIGRAVITY_AGENT',
  'CLAUDECODE',
  'CLAUDE_CODE_ENTRYPOINT',
  'CODEX_SANDBOX',
  'CODEX_THREAD_ID',
  'CURSOR_AGENT',
  'CURSOR_TRACE_ID',
  'OPENCODE_SESSION_ID',
];

const FALSY_VALUES: readonly string[] = ['0', 'false', 'no', 'off'];

let capturedEnvironment: AgentEnvironment | null = null;

const isSet = (value: string | undefined): boolean => {
  return (value?.trim() ?? '') !== '';
};

const isTruthy = (value: string | undefined): boolean => {
  const trimmed = value?.trim().toLowerCase() ?? '';

  return trimmed !== '' && !FALSY_VALUES.includes(trimmed);
};

const parseAgentEnvironment = (
  value: string | undefined,
): AgentEnvironment | null => {
  const trimmed = value?.trim().toLowerCase() ?? '';

  return AGENT_ENVIRONMENTS.find((known) => known === trimmed) ?? null;
};

/**
 * @description Reads the agent environment out of a process environment. Rungs, first hit wins:
 *
 * 1. `OPENTHROTTLE_MCP_ENVIRONMENT` — an explicit declaration by whatever launched the server.
 *    An unrecognised value is ignored, not trusted.
 * 2. `CI` truthy → `ci`.
 * 3. `OPENTHROTTLE_PLAN_ID` set → `ralph`: an orchestrator (workflow-ralph, or the OT Loop job,
 *    the headless runner the `ralph` environment covers) spawned this agent.
 * 4. A known agent-harness marker → `interactive`: an agent launched the server and no
 *    orchestrator or CI did.
 * 5. Otherwise null, and no header is sent.
 *
 * Exported for tests; the server calls {@link captureStdioAgentEnvironment}.
 */
export const detectAgentEnvironmentFromEnv = (
  env: Readonly<Record<string, string | undefined>>,
): AgentEnvironment | null => {
  const declared = parseAgentEnvironment(env['OPENTHROTTLE_MCP_ENVIRONMENT']);
  if (declared !== null) return declared;

  if (isTruthy(env['CI'])) return 'ci';

  if (isSet(env[RUN_IDENTITY_PLAN_ID_ENV])) return 'ralph';

  if (AGENT_HARNESS_ENV_MARKERS.some((marker) => isSet(env[marker]))) {
    return 'interactive';
  }

  return null;
};

/**
 * @description Records this process's agent environment. Stdio startup only — see the module
 * note. Pass null to clear it.
 */
export const captureStdioAgentEnvironment = (
  environment: AgentEnvironment | null = detectAgentEnvironmentFromEnv(
    process.env,
  ),
): void => {
  capturedEnvironment = environment;
};

/** @description The captured environment, or null (nothing detected, or the HTTP surface). */
export const getCapturedAgentEnvironment = (): AgentEnvironment | null => {
  return capturedEnvironment;
};

/**
 * @description The `X-OT-Environment` header for a GraphQL call, or an empty map when no
 * environment was captured.
 */
export const agentEnvironmentHeaders = (): Record<string, string> => {
  return capturedEnvironment === null
    ? {}
    : { [AGENT_ENVIRONMENT_HEADER]: capturedEnvironment };
};
