/**
 * Claude Code's half of the coverage heartbeat (contract §8), in three sections. The tool-neutral
 * input, send and receipt live in `../data/heartbeat.ts`.
 *
 * - Install facts: {@link resolveClaudeConfigDir}, {@link detectDeliveryLeg} and
 *   {@link parseMarketplaceInstall} say where Claude Code keeps its config, which delivery leg a
 *   hook runs under, and what the marketplace install record says.
 * - Claude run: {@link runHeartbeat} gathers those facts and hands them to the neutral sender.
 * - Foreign host: {@link isForeignHostHeartbeatShadowed} and {@link runForeignHostHeartbeat} send
 *   the heartbeat when another tool runs a Claude bundle.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  DeliveryLeg,
  HeartbeatReceipt,
  MarketplaceInstall,
} from '../data/heartbeat.ts';
import {
  detectDeliveryLeg as detectNeutralDeliveryLeg,
  isPathInside,
  readFirstManifestVersion,
  readTextOrNull,
  sendHeartbeat,
  UNKNOWN_MARKETPLACE_INSTALL,
} from '../data/heartbeat.ts';
import { DEFAULT_POST_TIMEOUT_MS } from '../data/persist.ts';
import type { HookFetch } from '../types.ts';
import {
  readAntigravityMarketplaceInstall,
  resolveAntigravityPluginsDir,
} from './antigravity-marketplace-install.ts';
import type { ClaudeBundleHost } from './claude-host.ts';
import { CLAUDE_SOURCE } from './claude-payload.ts';
import {
  readCodexMarketplaceInstall,
  resolveCodexHome,
  resolveCodexMarketplaceCacheDir,
} from './codex-marketplace-install.ts';
import { isCursorHeartbeatShadowed } from './cursor-heartbeat.ts';
import {
  readCursorMarketplaceInstall,
  resolveCursorMarketplaceCacheDir,
} from './cursor-marketplace-install.ts';

/** Key of this plugin in Claude Code's `installed_plugins.json`. */
const MARKETPLACE_PLUGIN_KEY = 'openthrottle@openthrottle';

/**
 * Claude Code's config directory: `CLAUDE_CONFIG_DIR` when set, else `~/.claude`.
 *
 * @public
 */
export const resolveClaudeConfigDir = (
  env: NodeJS.ProcessEnv,
  homeDir: string,
): string => {
  const configured = env.CLAUDE_CONFIG_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(homeDir, '.claude');
};

/**
 * Which delivery leg this process is running under (contract §8, first match wins):
 * the driver's `OPENTHROTTLE_HOOK_DELIVERY=plugin-dir` stamp; a plugin root under
 * `<claude config dir>/plugins/cache/` (marketplace); any other plugin root (a hand-passed
 * `--plugin-dir`); no plugin root (the repo's own settings).
 *
 * @public
 */
export const detectDeliveryLeg = ({
  env,
  homeDir,
}: {
  readonly env: NodeJS.ProcessEnv;
  readonly homeDir: string;
}): DeliveryLeg => {
  return detectNeutralDeliveryLeg({
    env,
    marketplaceCacheDir: path.join(
      resolveClaudeConfigDir(env, homeDir),
      'plugins',
      'cache',
    ),
    pluginRoot: env.CLAUDE_PLUGIN_ROOT ?? null,
  });
};

/**
 * Read the marketplace plugin out of `installed_plugins.json`'s text. `null` text (file unreadable)
 * and text whose shape is not recognized are both "unknown"; a readable file without the key is a
 * definite "not installed".
 *
 * @public
 */
export const parseMarketplaceInstall = (
  rawJson: string | null,
): MarketplaceInstall => {
  if (rawJson === null) {
    return UNKNOWN_MARKETPLACE_INSTALL;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return UNKNOWN_MARKETPLACE_INSTALL;
  }
  if (!isRecord(parsed) || !isRecord(parsed.plugins)) {
    return UNKNOWN_MARKETPLACE_INSTALL;
  }
  const entries = parsed.plugins[MARKETPLACE_PLUGIN_KEY];
  if (entries === undefined) {
    return { installed: false, version: null };
  }
  if (!Array.isArray(entries)) {
    return UNKNOWN_MARKETPLACE_INSTALL;
  }
  const [first] = entries;
  if (first === undefined) {
    return { installed: false, version: null };
  }
  const entryVersion = isRecord(first) ? first.version : null;
  const hasVersion = typeof entryVersion === 'string' && entryVersion !== '';
  return { installed: true, version: hasVersion ? entryVersion : null };
};

// ── Claude run ──
// Impure half of the Claude Code coverage heartbeat (contract §8): gather Claude Code's own facts —
// the delivery leg, the marketplace install, the running plugin's version — and hand them to the
// neutral `sendHeartbeat`. Kept apart from the entrypoint (`../scripts/claude-heartbeat.ts`) so it
// can be exercised without `process.exit`.

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

// ── Foreign host ──
// The coverage heartbeat a Claude bundle sends when another tool is running it (contract §8;
// docs/monorepo/agent-cli-hook-capability-matrix.md § Which tool is running the Claude bundles).
//
// The heartbeat goes out as the host — `source` is the host's id — while the delivery leg and the
// marketplace fields describe the install that delivered this copy: a Claude-installed plugin under
// Cursor reads Claude's `installed_plugins.json`, a codex install its `config.toml`, an agy copy its
// plugins directory. It stands down when the host's own registration of the heartbeat will send one,
// so a repository that registers both never sends two.

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
      deliveryLeg: detectNeutralDeliveryLeg({
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
    deliveryLeg: detectNeutralDeliveryLeg({
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
    deliveryLeg: detectNeutralDeliveryLeg({
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
    deliveryLeg: detectNeutralDeliveryLeg({
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
const resolveInstalledPluginVersion = (
  pluginRoot: string | null,
): string | null => {
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
    pluginVersion: resolveInstalledPluginVersion(install.pluginRoot),
    repoRoot,
    source: host,
    timeoutMs,
  });
};
