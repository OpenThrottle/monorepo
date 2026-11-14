/**
 * Where Antigravity (`agy`) keeps a user-level plugin install, and what a hook can tell from it
 * (contract §8; measured on agy 1.5.9, docs/monorepo/agent-cli-hook-capability-matrix.md §
 * Marketplace install records).
 *
 * `agy plugin install <dir>` and `agy plugin import claude` both land in
 * `~/.gemini/config/plugins/<dir>/`, with a `plugin.json` carrying the version; `agy plugin
 * disable` writes `plugins.<dir>.enabled = false` to `~/.gemini/config/config.json`, and
 * `uninstall` deletes the directory. agy's own `plugin@marketplace` form resolves only against two
 * catalogs compiled into the binary, so for OpenThrottle this directory is the whole of
 * "installed outside the repository".
 */
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import {
  isReadableDirectory,
  type MarketplaceInstall,
  readFirstManifestVersion,
  UNKNOWN_MARKETPLACE_INSTALL,
} from '../../data/heartbeat.ts';

/** The directory `agy plugin import claude` gives this repository's plugin. */
const PLUGIN_DIR_NAME = 'openthrottle';

/**
 * agy's user plugin directory.
 *
 * @public
 */
export const resolveAntigravityPluginsDir = (homeDir: string): string => {
  return path.join(homeDir, '.gemini', 'config', 'plugins');
};

/**
 * Whether `config.json`'s text leaves the OpenThrottle plugin enabled. agy writes the key only once
 * a plugin is toggled, so anything short of an explicit `enabled: false` is enabled.
 *
 * @public
 */
export const parseAntigravityPluginEnabled = (
  configJson: string | null,
): boolean => {
  if (configJson === null) {
    return true;
  }
  try {
    const parsed: unknown = JSON.parse(configJson);
    if (!isRecord(parsed) || !isRecord(parsed.plugins)) {
      return true;
    }
    const entry = parsed.plugins[PLUGIN_DIR_NAME];
    return !(isRecord(entry) && entry.enabled === false);
  } catch {
    return true;
  }
};

/**
 * The OpenThrottle plugin as agy records it. Unknown when neither the plugins directory nor its
 * parent can be listed; a disabled install reads as not installed, because it runs nothing.
 *
 * @public
 */
export const readAntigravityMarketplaceInstall = ({
  configJson,
  pluginsDir,
}: {
  readonly configJson: string | null;
  readonly pluginsDir: string;
}): MarketplaceInstall => {
  if (!isReadableDirectory(pluginsDir)) {
    return isReadableDirectory(path.dirname(pluginsDir))
      ? { installed: false, version: null }
      : UNKNOWN_MARKETPLACE_INSTALL;
  }
  const pluginDir = path.join(pluginsDir, PLUGIN_DIR_NAME);
  if (
    !isReadableDirectory(pluginDir) ||
    !parseAntigravityPluginEnabled(configJson)
  ) {
    return { installed: false, version: null };
  }
  return {
    installed: true,
    version: readFirstManifestVersion([
      path.join(pluginDir, 'plugin.json'),
      path.join(pluginDir, '.claude-plugin', 'plugin.json'),
    ]),
  };
};
