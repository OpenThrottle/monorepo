/**
 * Where Codex keeps a marketplace install, and what a hook can tell from it (contract §8; measured
 * on codex-cli 0.167.0, docs/monorepo/agent-cli-hook-capability-matrix.md § Marketplace install
 * records).
 *
 * `codex plugin add <plugin>@<marketplace>` writes a `[plugins."<plugin>@<marketplace>"]` table with
 * `enabled = true` to `$CODEX_HOME/config.toml` and unpacks to
 * `$CODEX_HOME/plugins/cache/<marketplace>/<plugin>/<version>/`; `codex plugin remove` deletes
 * both. This repository's Claude-format marketplace installs as `openthrottle@openthrottle`.
 */
import path from 'node:path';

import type { MarketplaceInstall } from '../data/heartbeat.ts';
import {
  listSubdirectoriesNewestFirst,
  readFirstManifestVersion,
  UNKNOWN_MARKETPLACE_INSTALL,
} from '../data/heartbeat.ts';

const MARKETPLACE_NAME = 'openthrottle';
const PLUGIN_NAME = 'openthrottle';

/** `[plugins."openthrottle@openthrottle"]`, either quote style, optional trailing comment. */
const PLUGIN_TABLE_HEADER =
  /^\s*\[\s*plugins\s*\.\s*(["'])openthrottle@openthrottle\1\s*\]\s*(#.*)?$/;
const ANY_TABLE_HEADER = /^\s*\[/;
const ENABLED_LINE = /^\s*enabled\s*=\s*(true|false)\s*(#.*)?$/;

/**
 * Codex's home: `CODEX_HOME` when set, else `~/.codex`.
 *
 * @public
 */
export const resolveCodexHome = (
  env: NodeJS.ProcessEnv,
  homeDir: string,
): string => {
  const configured = env.CODEX_HOME?.trim();
  return configured ? path.resolve(configured) : path.join(homeDir, '.codex');
};

/**
 * Codex's marketplace cache directory under a Codex home.
 *
 * @public
 */
export const resolveCodexMarketplaceCacheDir = (codexHome: string): string => {
  return path.join(codexHome, 'plugins', 'cache');
};

/**
 * Whether `config.toml`'s text enables the OpenThrottle plugin: null when the text is unreadable,
 * false when the table is absent or `enabled = false`. A table with no `enabled` key is installed.
 * A line scan rather than a TOML parser — the table is a header plus one key, and the hook bundle
 * stays dependency-free.
 *
 * @public
 */
export const parseCodexPluginEnabled = (
  configToml: string | null,
): boolean | null => {
  if (configToml === null) {
    return null;
  }
  const lines = configToml.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => {
    return PLUGIN_TABLE_HEADER.test(line);
  });
  if (headerIndex === -1) {
    return false;
  }
  for (const line of lines.slice(headerIndex + 1)) {
    if (ANY_TABLE_HEADER.test(line)) {
      break;
    }
    const match = ENABLED_LINE.exec(line);
    if (match !== null) {
      return match[1] === 'true';
    }
  }
  return true;
};

/**
 * The OpenThrottle marketplace install as Codex records it: the `config.toml` table decides
 * installed, the newest cache directory's manifest gives the version.
 *
 * @public
 */
export const readCodexMarketplaceInstall = ({
  cacheDir,
  configToml,
}: {
  readonly cacheDir: string;
  readonly configToml: string | null;
}): MarketplaceInstall => {
  const enabled = parseCodexPluginEnabled(configToml);
  if (enabled === null) {
    return UNKNOWN_MARKETPLACE_INSTALL;
  }
  if (!enabled) {
    return { installed: false, version: null };
  }
  const [newest] = listSubdirectoriesNewestFirst(
    path.join(cacheDir, MARKETPLACE_NAME, PLUGIN_NAME),
  );
  if (newest === undefined) {
    return { installed: true, version: null };
  }
  return {
    installed: true,
    version: readFirstManifestVersion([
      path.join(newest, '.codex-plugin', 'plugin.json'),
      path.join(newest, '.claude-plugin', 'plugin.json'),
      path.join(newest, 'plugin.json'),
    ]),
  };
};
