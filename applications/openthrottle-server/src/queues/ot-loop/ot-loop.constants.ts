/**
 * Constants for the OT Loop runner (docs/workflows/ot-loop-job.md). It runs on the `Plans` queue under
 * the existing `'Agentic Ralph'` job name; nothing here names a queue or a job.
 */

/** @description DI token for the worker-scoped GraphQL executor the OT Loop service calls. */
export const OT_LOOP_EXECUTE_GRAPHQL = Symbol('OT_LOOP_EXECUTE_GRAPHQL');

/** @description Header carrying the processor's run work-session id on status-mutating calls. */
export const OT_LOOP_SESSION_HEADER = 'X-OT-Session-Id';

/** @description `tool_name` recorded on each per-task work session. */
export const OT_LOOP_TOOL_NAME = 'ot-loop';

/** @description Prefix on every narration line the job writes to plan output. */
export const OT_LOOP_NARRATION_PREFIX = '[ot-loop]';

/**
 * @description Environment variables the OT MCP authenticates with (§ 2, prevention). The worker's
 * env sets each to an empty string: a driver's child env is the inherited `process.env` merged
 * under the extra variables, so blanking is the only way to remove a key. The MCP treats a blank
 * token as missing and fails auth instead of writing. `OT_MCP_AUTH_TOKEN_ENV_FILE` is blanked too
 * because the MCP re-reads its token from that file mid-session.
 */
export const OT_LOOP_WORKER_BLANKED_ENV_KEYS = [
  'OPENTHROTTLE_MCP_AUTH_TOKEN',
  'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
  'OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN',
  'OT_MCP_AUTH_TOKEN_ENV_FILE',
] as const;

/** @description Headline written on a task the final validation creates when it is red (§ 6). */
export const OT_LOOP_FINAL_VALIDATION_TASK_TITLE = 'Final validation failed';

/** @description Category of the BLOCKED task a red final validation creates. */
export const OT_LOOP_FINAL_VALIDATION_TASK_CATEGORY = 'test';

/** @description Base branch finalize squashes onto when the run names none. */
export const OT_LOOP_DEFAULT_BASE_BRANCH = 'main';
