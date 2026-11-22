/**
 * Impure half of the Claude Code coverage heartbeat (contract §8): gather Claude Code's own facts —
 * the delivery leg, the marketplace install, the running plugin's version — and hand them to the
 * neutral `sendHeartbeat`. Kept apart from the entrypoint so it can be exercised without
 * `process.exit`.
 */
import os from 'node:os';
import path from 'node:path';

import type { HeartbeatReceipt } from '../../data/heartbeat.ts';
import {
  readFirstManifestVersion,
  readTextOrNull,
  sendHeartbeat,
} from '../../data/heartbeat.ts';
import { DEFAULT_POST_TIMEOUT_MS } from '../../data/persist.ts';
import type { HookFetch } from '../../types.ts';
import {
  detectDeliveryLeg,
  parseMarketplaceInstall,
  resolveClaudeConfigDir,
} from './heartbeat-payload.ts';
import { CLAUDE_SOURCE } from './payload.ts';

/** The running payload's own version, or null outside a plugin. */
const resolvePluginVersion = (env: NodeJS.ProcessEnv): string | null => {
  const pluginRoot = env.CLAUDE_PLUGIN_ROOT?.trim();
  if (!pluginRoot) {
    return null;
  }
  return readFirstManifestVersion([
    path.join(pluginRoot, '.claude-plugin', 'plugin.json'),
    path.join(pluginRoot, 'plugin.json'),
  ]);
};

/**
 * Gather the facts, post one heartbeat, record the receipt. Never throws. Returns the receipt, or
 * null when no heartbeat could be built (no machine id).
 *
 * @public
 */
export const runHeartbeat = async ({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  repoRoot,
  resolveRepoIdentity,
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
}: {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: HookFetch;
  readonly now?: () => Date;
  readonly repoRoot: string;
  readonly resolveRepoIdentity?: (repoRoot: string) => string | null;
  readonly timeoutMs?: number;
}): Promise<HeartbeatReceipt | null> => {
  const homeDir = os.homedir();
  const marketplaceRaw = readTextOrNull(
    path.join(
      resolveClaudeConfigDir(env, homeDir),
      'plugins',
      'installed_plugins.json',
    ),
  );
  return sendHeartbeat({
    deliveryLeg: detectDeliveryLeg({ env, homeDir }),
    env,
    fetchImpl,
    marketplace: parseMarketplaceInstall(marketplaceRaw),
    now,
    pluginVersion: resolvePluginVersion(env),
    repoRoot,
    resolveRepoIdentity,
    source: CLAUDE_SOURCE,
    timeoutMs,
  });
};
