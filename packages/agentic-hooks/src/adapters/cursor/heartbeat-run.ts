/**
 * Impure half of the Cursor coverage heartbeat (contract §8): gather Cursor's own facts — the
 * delivery leg and the running plugin's version — and hand them to the neutral `sendHeartbeat`.
 *
 * The delivery leg is decided by the SCRIPT'S location, not by `CURSOR_PLUGIN_ROOT` alone: measured
 * on cursor-agent 2026.11.13, a project hook can run with `CURSOR_PLUGIN_ROOT` still pointing at
 * some other installed plugin, so its mere presence proves nothing. Cursor's marketplace install
 * location is unmeasured, so a marketplace install reads as `plugin-dir` and its install record as
 * unknown — honest nulls rather than a guessed path.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  detectDeliveryLeg,
  type HeartbeatReceipt,
  isPathInside,
  readFirstManifestVersion,
  sendHeartbeat,
  UNKNOWN_MARKETPLACE_INSTALL,
} from '../../data/heartbeat.ts';
import { DEFAULT_POST_TIMEOUT_MS } from '../../data/persist.ts';
import type { HookFetch } from '../../types.ts';
import { CURSOR_SOURCE } from './payload.ts';

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

/** True when the repository's own `.cursor/hooks.json` registers the heartbeat bundle. */
const repoRegistersHeartbeat = (repoRoot: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(path.join(repoRoot, '.cursor', 'hooks.json'), 'utf8'),
    );
    if (typeof parsed !== 'object' || parsed === null || !('hooks' in parsed)) {
      return false;
    }
    return JSON.stringify(parsed.hooks).includes(HEARTBEAT_BUNDLE);
  } catch {
    return false;
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
  return (
    resolveOwnPluginRoot(env, scriptPath) !== null &&
    repoRegistersHeartbeat(repoRoot)
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
  now = () => new Date(),
  repoRoot,
  scriptPath = process.argv[1],
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
}: {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: HookFetch;
  readonly now?: () => Date;
  readonly repoRoot: string;
  readonly scriptPath?: string;
  readonly timeoutMs?: number;
}): Promise<HeartbeatReceipt | null> => {
  const pluginRoot = resolveOwnPluginRoot(env, scriptPath);
  return sendHeartbeat({
    deliveryLeg: detectDeliveryLeg({
      env,
      marketplaceCacheDir: null,
      pluginRoot,
    }),
    env,
    fetchImpl,
    marketplace: UNKNOWN_MARKETPLACE_INSTALL,
    now,
    pluginVersion: resolvePluginVersion(pluginRoot),
    repoRoot,
    source: CURSOR_SOURCE,
    timeoutMs,
  });
};
