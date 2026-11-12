/**
 * The ACP feature flag. `OPENTHROTTLE_CHAT_ACP_BACKENDS` is a comma-separated
 * list of driver ids (or `all`) whose chat turns run over ACP instead of the
 * per-CLI headless adapter. Unset ⇒ every backend keeps its CLI adapter.
 *
 * Read per turn, not at import, so flipping it needs no server restart. Only
 * drivers with an {@link ACP_AGENT_SPECS} entry can be routed; the rest ignore
 * the flag. Plan runs (Ralph, scheduled jobs, ot-loop), hooks and
 * `--plugin-dir` injection never go through here — this is chat only.
 */

import type { ConversationBackend, ConversationBackendRun } from '../types.ts';
import { createAcpConversationBackend } from './acp.ts';
import { ACP_AGENT_SPECS } from './agent-specs.ts';

/**
 * Env var naming the driver ids whose chat runs over ACP (`cursor`, or
 * `all`).
 *
 * @public
 */
export const CHAT_ACP_BACKENDS_ENV = 'OPENTHROTTLE_CHAT_ACP_BACKENDS';

/**
 * True when the flag routes `driverId`'s chat through ACP and an ACP spec
 * exists for it.
 *
 * @public
 */
export function isAcpChatEnabled(
  driverId: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (ACP_AGENT_SPECS[driverId] === undefined) {
    return false;
  }

  const listed = (env[CHAT_ACP_BACKENDS_ENV] ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase());

  return listed.includes('all') || listed.includes(driverId);
}

/**
 * Wrap a driver's CLI backend so each turn goes to its ACP backend when the
 * flag selects it, and to the CLI backend otherwise. The ACP backend (and its
 * session pool) is created on first use.
 *
 * @public
 */
export function withAcpRouting(
  driverId: string,
  cliBackend: ConversationBackend,
): ConversationBackend {
  let acpBackend: ConversationBackend | undefined;

  return {
    stream: (run: ConversationBackendRun) => {
      const spec = ACP_AGENT_SPECS[driverId];
      if (spec === undefined || !isAcpChatEnabled(driverId)) {
        return cliBackend.stream(run);
      }

      acpBackend ??= createAcpConversationBackend(spec);
      return acpBackend.stream(run);
    },
  };
}
