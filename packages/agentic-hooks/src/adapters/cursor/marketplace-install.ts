/**
 * Where Cursor keeps a marketplace install, and what a hook can tell from it (contract §8; measured
 * on cursor-agent 2026.11.13, docs/monorepo/agent-cli-hook-capability-matrix.md § Marketplace
 * install records).
 *
 * Cursor's real install record is the IDE's sqlite store, keyed by numeric server ids — nothing a
 * hook can read. Its cache directory is the next best thing: each install unpacks to
 * `~/.cursor/plugins/cache/<marketplace>/<plugin>/<git sha>/`, and a finished unpack carries a
 * `.cache-complete` marker. Whether an IDE uninstall prunes that cache is unmeasured, so a stale
 * cache could read as installed; an absent one is a definite "not installed".
 */
import fs from 'node:fs';
import path from 'node:path';

import type { MarketplaceInstall } from '../../data/heartbeat.ts';
import {
  isReadableDirectory,
  listSubdirectoriesNewestFirst,
  readFirstManifestVersion,
  UNKNOWN_MARKETPLACE_INSTALL,
} from '../../data/heartbeat.ts';

/** The marketplace and plugin names this repository publishes under. */
const MARKETPLACE_NAME = 'openthrottle';
const PLUGIN_NAME = 'openthrottle';

/** The file Cursor writes once a plugin has finished unpacking. */
const CACHE_COMPLETE_MARKER = '.cache-complete';

/**
 * Cursor's marketplace cache directory.
 *
 * @public
 */
export const resolveCursorMarketplaceCacheDir = (homeDir: string): string => {
  return path.join(homeDir, '.cursor', 'plugins', 'cache');
};

/**
 * Whether the OpenThrottle plugin sits, fully unpacked, in Cursor's marketplace cache, and at which
 * version. Unknown when neither the cache nor its parent can be listed.
 *
 * @public
 */
export const readCursorMarketplaceInstall = (
  cacheDir: string,
): MarketplaceInstall => {
  if (!isReadableDirectory(cacheDir)) {
    return isReadableDirectory(path.dirname(cacheDir))
      ? { installed: false, version: null }
      : UNKNOWN_MARKETPLACE_INSTALL;
  }
  const [newest] = listSubdirectoriesNewestFirst(
    path.join(cacheDir, MARKETPLACE_NAME, PLUGIN_NAME),
  ).filter((dir) => fs.existsSync(path.join(dir, CACHE_COMPLETE_MARKER)));
  if (newest === undefined) {
    return { installed: false, version: null };
  }
  return {
    installed: true,
    version: readFirstManifestVersion([
      path.join(newest, '.cursor-plugin', 'plugin.json'),
      path.join(newest, '.claude-plugin', 'plugin.json'),
      path.join(newest, 'plugin.json'),
    ]),
  };
};
