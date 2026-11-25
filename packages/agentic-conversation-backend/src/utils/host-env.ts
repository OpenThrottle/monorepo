/**
 * @description The host env a chat child inherits: the chat base keys plus the CLI's own
 * host-login keys, single-sourced from its driver definition (`AgentDriver.hostEnv`) so a chat turn
 * and a headless run of the same CLI admit the same login variables. Chat-only extras (the claude
 * config-dir override, cursor's forced values, each run's `mcpEnv`) stay with their adapter.
 */

import type { DriverHostEnv } from '@openthrottle/openthrottle-drivers';

/**
 * Non-secret host env every chat child inherits: login identity + locale. `USER` is load-bearing
 * on macOS — without it the Claude CLI cannot find the subscription login in the Keychain.
 *
 * @public
 */
export const CHAT_BASE_ENV_KEYS = [
  'HOME',
  'LANG',
  'LC_ALL',
  'LOGNAME',
  'PATH',
  'TERM',
  'TMPDIR',
  'USER',
] as const;

/**
 * @description The allowlisted chat child env: {@link CHAT_BASE_ENV_KEYS} and the driver's
 * `hostEnv` keys and prefixes read from `env`, then `extra` (the run's explicit variables) on top.
 *
 * @public
 */
export const pickChatHostEnv = (
  env: NodeJS.ProcessEnv,
  hostEnv: DriverHostEnv,
  extra?: Readonly<Record<string, string>>,
): NodeJS.ProcessEnv => {
  const keys = new Set<string>([...CHAT_BASE_ENV_KEYS, ...hostEnv.keys]);
  const scrubbed: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    const isAllowed =
      keys.has(key) ||
      hostEnv.prefixes.some((prefix) => key.startsWith(prefix));
    if (value !== undefined && isAllowed) {
      scrubbed[key] = value;
    }
  }

  return { ...scrubbed, ...extra };
};
