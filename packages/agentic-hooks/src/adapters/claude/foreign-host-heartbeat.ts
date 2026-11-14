/**
 * The coverage heartbeat a Claude bundle sends when another tool is running it (contract §8;
 * docs/monorepo/agent-cli-hook-capability-matrix.md § Which tool is running the Claude bundles).
 *
 * The heartbeat goes out as the host — `source` is the host's id — while the delivery leg and the
 * marketplace fields describe the install that delivered this copy: a Claude-installed plugin under
 * Cursor reads Claude's `installed_plugins.json`, a codex install its `config.toml`, an agy copy its
 * plugins directory. It stands down when the host's own registration of the heartbeat will send one,
 * so a repository that registers both never sends two.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  type DeliveryLeg,
  detectDeliveryLeg,
  type HeartbeatReceipt,
  isPathInside,
  type MarketplaceInstall,
  readFirstManifestVersion,
  readTextOrNull,
  sendHeartbeat,
} from '../../data/heartbeat.ts';
import { DEFAULT_POST_TIMEOUT_MS } from '../../data/persist.ts';
import type { HookFetch } from '../../types.ts';
import {
  readAntigravityMarketplaceInstall,
  resolveAntigravityPluginsDir,
} from '../antigravity/marketplace-install.ts';
import {
  readCodexMarketplaceInstall,
  resolveCodexHome,
  resolveCodexMarketplaceCacheDir,
} from '../codex/marketplace-install.ts';
import { isCursorHeartbeatShadowed } from '../cursor/heartbeat-run.ts';
import {
  readCursorMarketplaceInstall,
  resolveCursorMarketplaceCacheDir,
} from '../cursor/marketplace-install.ts';
import type { ClaudeBundleHost } from './bundle-host.ts';
import {
  parseMarketplaceInstall,
  resolveClaudeConfigDir,
} from './heartbeat-payload.ts';

/** The bundle name every tool's registration of the heartbeat points at. */
const HEARTBEAT_BUNDLE = 'skill-usage-heartbeat';

/** A host other than Claude Code. @public */
export type ForeignBundleHost = Exclude<ClaudeBundleHost, 'claude-code'>;

interface ForeignHostContext {
  readonly env: NodeJS.ProcessEnv;
  readonly homeDir: string;
  readonly host: ForeignBundleHost;
  readonly repoRoot: string;
  readonly scriptPath: string | undefined;
}

/** Inputs to {@link isForeignHostHeartbeatShadowed}; the defaults are the running process's. */
interface ShadowCheckOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly homeDir?: string;
  readonly host: ForeignBundleHost;
  readonly repoRoot: string;
  readonly scriptPath?: string;
}

/** What the heartbeat reports about the install this copy came from. */
interface DeliveringInstall {
  readonly deliveryLeg: DeliveryLeg;
  readonly marketplace: MarketplaceInstall;
  readonly pluginRoot: string | null;
}

/** True when the file at `filePath` exists and names the heartbeat bundle. */
const fileNamesHeartbeat = (filePath: string): boolean => {
  return readTextOrNull(filePath)?.includes(HEARTBEAT_BUNDLE) ?? false;
};

/** True when a workspace plugin under `<repo>/.agents/plugins/` registers the heartbeat. */
const repoAgentsPluginRegistersHeartbeat = (repoRoot: string): boolean => {
  const pluginsDir = path.join(repoRoot, '.agents', 'plugins');
  let names: readonly string[];
  try {
    names = fs.readdirSync(pluginsDir);
  } catch {
    return false;
  }
  return names.some((name) => {
    return fileNamesHeartbeat(path.join(pluginsDir, name, 'hooks.json'));
  });
};

/**
 * Whether the host's own registration of the heartbeat will run in this session, in which case
 * this copy stands down. cursor: the repo's `.cursor/hooks.json`; codex: `$CODEX_HOME/config.toml`
 * or the repo's `.codex/config.toml`; agy: a workspace plugin under `.agents/plugins/`.
 *
 * @public
 */
export const isForeignHostHeartbeatShadowed = ({
  env = process.env,
  homeDir = os.homedir(),
  host,
  repoRoot,
  scriptPath = process.argv[1],
}: ShadowCheckOptions): boolean => {
  if (host === 'cursor') {
    return isCursorHeartbeatShadowed({ env, repoRoot, scriptPath });
  }
  if (host === 'codex') {
    return (
      fileNamesHeartbeat(
        path.join(resolveCodexHome(env, homeDir), 'config.toml'),
      ) || fileNamesHeartbeat(path.join(repoRoot, '.codex', 'config.toml'))
    );
  }
  return repoAgentsPluginRegistersHeartbeat(repoRoot);
};

/** The install a Cursor-run copy came from: Claude's marketplace, Cursor's, or a plugin dir. */
const resolveCursorInstall = ({
  env,
  homeDir,
}: ForeignHostContext): DeliveringInstall => {
  const pluginRoot = env.CURSOR_PLUGIN_ROOT?.trim() || null;
  const claudeCache = path.join(
    resolveClaudeConfigDir(env, homeDir),
    'plugins',
    'cache',
  );
  if (pluginRoot !== null && isPathInside(claudeCache, pluginRoot)) {
    return {
      deliveryLeg: detectDeliveryLeg({
        env,
        marketplaceCacheDir: claudeCache,
        pluginRoot,
      }),
      marketplace: parseMarketplaceInstall(
        readTextOrNull(
          path.join(path.dirname(claudeCache), 'installed_plugins.json'),
        ),
      ),
      pluginRoot,
    };
  }
  const cursorCache = resolveCursorMarketplaceCacheDir(homeDir);
  return {
    deliveryLeg: detectDeliveryLeg({
      env,
      marketplaceCacheDir: cursorCache,
      pluginRoot,
    }),
    marketplace: readCursorMarketplaceInstall(cursorCache),
    pluginRoot,
  };
};

/** The install a codex-run copy came from: always under codex's marketplace cache. */
const resolveCodexInstall = ({
  env,
  homeDir,
  scriptPath,
}: ForeignHostContext): DeliveringInstall => {
  const codexHome = resolveCodexHome(env, homeDir);
  const cacheDir = resolveCodexMarketplaceCacheDir(codexHome);
  const pluginRoot =
    env.CLAUDE_PLUGIN_ROOT?.trim() ||
    env.PLUGIN_ROOT?.trim() ||
    (scriptPath ? path.dirname(path.dirname(scriptPath)) : null);
  return {
    deliveryLeg: detectDeliveryLeg({
      env,
      marketplaceCacheDir: cacheDir,
      pluginRoot,
    }),
    marketplace: readCodexMarketplaceInstall({
      cacheDir,
      configToml: readTextOrNull(path.join(codexHome, 'config.toml')),
    }),
    pluginRoot,
  };
};

/** The install an agy-run copy came from: `~/.gemini/config/plugins/<dir>/`, run as `./hooks/…`. */
const resolveAntigravityInstall = ({
  env,
  homeDir,
  scriptPath,
}: ForeignHostContext): DeliveringInstall => {
  const pluginsDir = resolveAntigravityPluginsDir(homeDir);
  const pluginRoot = scriptPath ? path.dirname(path.dirname(scriptPath)) : null;
  return {
    deliveryLeg: detectDeliveryLeg({
      env,
      marketplaceCacheDir: pluginsDir,
      pluginRoot,
    }),
    marketplace: readAntigravityMarketplaceInstall({
      configJson: readTextOrNull(
        path.join(path.dirname(pluginsDir), 'config.json'),
      ),
      pluginsDir,
    }),
    pluginRoot,
  };
};

const resolveDeliveringInstall = (
  context: ForeignHostContext,
): DeliveringInstall => {
  if (context.host === 'cursor') {
    return resolveCursorInstall(context);
  }
  if (context.host === 'codex') {
    return resolveCodexInstall(context);
  }
  return resolveAntigravityInstall(context);
};

/** The running copy's own version, from whichever manifest its install carries. */
const resolvePluginVersion = (pluginRoot: string | null): string | null => {
  if (pluginRoot === null) {
    return null;
  }
  return readFirstManifestVersion([
    path.join(pluginRoot, '.claude-plugin', 'plugin.json'),
    path.join(pluginRoot, 'plugin.json'),
  ]);
};

/**
 * Post one heartbeat as `host`, describing the install this copy came from, and record the
 * receipt. Never throws. Returns the receipt, or null when no heartbeat could be built.
 *
 * @public
 */
export const runForeignHostHeartbeat = async ({
  env = process.env,
  fetchImpl = globalThis.fetch,
  homeDir = os.homedir(),
  host,
  now = () => new Date(),
  repoRoot,
  scriptPath = process.argv[1],
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
}: {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: HookFetch;
  readonly homeDir?: string;
  readonly host: ForeignBundleHost;
  readonly now?: () => Date;
  readonly repoRoot: string;
  readonly scriptPath?: string;
  readonly timeoutMs?: number;
}): Promise<HeartbeatReceipt | null> => {
  const install = resolveDeliveringInstall({
    env,
    homeDir,
    host,
    repoRoot,
    scriptPath,
  });
  return sendHeartbeat({
    deliveryLeg: install.deliveryLeg,
    env,
    fetchImpl,
    marketplace: install.marketplace,
    now,
    pluginVersion: resolvePluginVersion(install.pluginRoot),
    repoRoot,
    source: host,
    timeoutMs,
  });
};
