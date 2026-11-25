/**
 * The scrubbed child environment for agy, shared by the headless `-p` adapter
 * and the ACP spec (`agy acp`). Kept in its own module so the ACP spec does not
 * pull the whole stream-json adapter into everything that imports the specs
 * (the hook bundles among them).
 */

import { antigravityDriver } from '@openthrottle/openthrottle-drivers';

import { pickChatHostEnv } from './host-env.ts';

/**
 * Build a minimal allowlisted environment for the spawned child. `extra` (the run's `mcpEnv`) is
 * merged on top: the host env stays allowlisted, and only the explicit server-provided keys are
 * admitted. Shared with the ACP spec, which launches the same binary as `agy acp`.
 */
export function buildAntigravityEnv(
  env: NodeJS.ProcessEnv = process.env,
  extra?: Readonly<Record<string, string>>,
): NodeJS.ProcessEnv {
  return pickChatHostEnv(env, antigravityDriver.hostEnv, extra);
}
