/**
 * Antigravity (`agy`) adapter — producer id only, for now.
 *
 * Written against payloads captured from agy 1.5.9 (`__tests__/fixtures/`, paths scrubbed;
 * docs/monorepo/agent-cli-hook-capability-matrix.md). agy's envelope is camelCase —
 * `conversationId`, `cwd`, `workspacePaths`, `modelName`, `hookEventName` — and its
 * `SessionStart` carries `lastUserInput`, the user's prompt, which nothing here reads.
 *
 * There is no skill capture or completion adapter yet: only the coverage heartbeat
 * (`heartbeat.ts`), which reads nothing but `cwd`.
 */

/** Producer id stamped onto everything this adapter emits; the drivers' id for agy. @public */
export const ANTIGRAVITY_SOURCE = 'antigravity';
