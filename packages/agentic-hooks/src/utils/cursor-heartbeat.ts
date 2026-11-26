/**
 * Impure half of the Cursor coverage heartbeat (contract §8): gather Cursor's own facts — the
 * delivery leg and the running plugin's version — and hand them to the neutral `sendHeartbeat`.
 *
 * The delivery leg is decided by the SCRIPT'S location, not by `CURSOR_PLUGIN_ROOT` alone: measured
 * on cursor-agent 2026.11.13, a project hook can run with `CURSOR_PLUGIN_ROOT` still pointing at
 * some other installed plugin, so its mere presence proves nothing. A plugin root under Cursor's
 * marketplace cache (`~/.cursor/plugins/cache/`) is `marketplace`, and the install itself is read
 * from that cache — see `./cursor-marketplace-install.ts`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { HeartbeatReceipt } from '../data/heartbeat.ts';
import {
  detectDeliveryLeg,
  isPathInside,
  readFirstManifestVersion,
  sendHeartbeat,
} from '../data/heartbeat.ts';
import { DEFAULT_POST_TIMEOUT_MS } from '../data/persist.ts';
import type { HookFetch } from '../types.ts';
import {
  readCursorMarketplaceInstall,
  resolveCursorMarketplaceCacheDir,
} from './cursor-marketplace-install.ts';
import { CURSOR_SOURCE } from './cursor-payload.ts';

/** The bundle name both the repo's and the plugin's registration point at. */
const HEARTBEAT_BUNDLE = 'skill-usage-heartbeat';

/** `CURSOR_PLUGIN_ROOT`, but only when the running script actually lives under it. */
const resolveOwnPluginRoot = (
  env: NodeJS.ProcessEnv,
  scriptPath: string | undefined,
): string | null => {
  const pluginRoot = env.CURSOR_PLUGIN_ROOT?.trim();
  if (!pluginRoot || !scriptPath) {
    return null;
  }
  return isPathInside(pluginRoot, scriptPath) ? pluginRoot : null;
};

/** The plugin's own version, in Cursor's manifest lookup order; null outside a plugin. */
const resolvePluginVersion = (pluginRoot: string | null): string | null => {
  if (pluginRoot === null) {
    return null;
  }
  return readFirstManifestVersion([
    path.join(pluginRoot, '.cursor-plugin', 'plugin.json'),
    path.join(pluginRoot, '.claude-plugin', 'plugin.json'),
    path.join(pluginRoot, 'plugin.json'),
  ]);
};

/**
 * The heartbeat commands the repository's own `.cursor/hooks.json` registers, resolved against the
 * repository root. Empty when it registers none or the file is unreadable.
 */
const repoHeartbeatRegistrations = (repoRoot: string): readonly string[] => {
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(path.join(repoRoot, '.cursor', 'hooks.json'), 'utf8'),
    );
    if (typeof parsed !== 'object' || parsed === null || !('hooks' in parsed)) {
      return [];
    }
    const commands: string[] = [];
    JSON.stringify(parsed.hooks, (key, value: unknown) => {
      if (key === 'command' && typeof value === 'string') {
        commands.push(value);
      }
      return value;
    });
    return commands
      .filter((command) => command.includes(HEARTBEAT_BUNDLE))
      .map((command) => path.resolve(repoRoot, command));
  } catch {
    return [];
  }
};

/**
 * Whether this is the plugin's copy of the heartbeat in a repository that registers its own, in
 * which case the repository's copy sends the one heartbeat. Any doubt means "not shadowed".
 *
 * @public
 */
export const isCursorHeartbeatShadowed = ({
  env = process.env,
  repoRoot,
  scriptPath = process.argv[1],
}: {
  readonly env?: NodeJS.ProcessEnv;
  readonly repoRoot: string;
  readonly scriptPath?: string;
}): boolean => {
  const pluginRoot = resolveOwnPluginRoot(env, scriptPath);
  if (pluginRoot === null) {
    return false;
  }
  // A repository may register the very payload it is also loaded from — this repo's own
  // `.cursor/hooks.json` points into `plugins/openthrottle-cursor/`. Then both runs are the same
  // file under the same plugin root and cannot tell themselves apart, so standing down would send
  // nothing. Only a registration OUTSIDE this plugin root shadows it.
  return repoHeartbeatRegistrations(repoRoot).some(
    (registered) => !isPathInside(pluginRoot, registered),
  );
};

/**
 * Gather Cursor's facts, post one heartbeat, record the receipt. Never throws. Returns the receipt,
 * or null when no heartbeat could be built (no machine id).
 *
 * @public
 */
export const runCursorHeartbeat = async ({
  env = process.env,
  fetchImpl = globalThis.fetch,
  homeDir = os.homedir(),
  now = () => new Date(),
  repoRoot,
  scriptPath = process.argv[1],
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
}: {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: HookFetch;
  readonly homeDir?: string;
  readonly now?: () => Date;
  readonly repoRoot: string;
  readonly scriptPath?: string;
  readonly timeoutMs?: number;
}): Promise<HeartbeatReceipt | null> => {
  const pluginRoot = resolveOwnPluginRoot(env, scriptPath);
  const marketplaceCacheDir = resolveCursorMarketplaceCacheDir(homeDir);
  return sendHeartbeat({
    deliveryLeg: detectDeliveryLeg({
      env,
      marketplaceCacheDir,
      pluginRoot,
    }),
    env,
    fetchImpl,
    marketplace: readCursorMarketplaceInstall(marketplaceCacheDir),
    now,
    pluginVersion: resolvePluginVersion(pluginRoot),
    repoRoot,
    source: CURSOR_SOURCE,
    timeoutMs,
  });
};
