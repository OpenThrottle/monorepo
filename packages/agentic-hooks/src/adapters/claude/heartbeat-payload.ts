/**
 * Claude Code's half of the coverage heartbeat (contract §8): where Claude Code keeps its config,
 * which delivery leg a hook is running under, and what its marketplace install record says. The
 * tool-neutral input, send and receipt live in `src/data/heartbeat.ts`.
 */
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import {
  type DeliveryLeg,
  detectDeliveryLeg as detectNeutralDeliveryLeg,
  type MarketplaceInstall,
  UNKNOWN_MARKETPLACE_INSTALL,
} from '../../data/heartbeat.ts';

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
