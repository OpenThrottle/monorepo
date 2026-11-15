/**
 * Which tool is running a Claude bundle. The marketplace plugin's hooks are the Claude bundles, and
 * cursor-agent, codex and agy all run them — so without this check every marketplace install reached
 * through another tool reports itself as a Claude Code session (OT plan `8f9ce368`;
 * docs/monorepo/agent-cli-hook-capability-matrix.md § Which tool is running the Claude bundles).
 *
 * Only per-hook markers count. A hook inherits its host's whole environment, so `CLAUDECODE` and
 * friends reach a cursor-agent hook whenever cursor-agent was started from a Claude Code session.
 * Any doubt means `claude-code`, which is what every bundle reported before this check existed.
 */
import os from 'node:os';
import path from 'node:path';

import { isPathInside } from '../../data/heartbeat.ts';
import { resolveAntigravityPluginsDir } from '../antigravity/marketplace-install.ts';
import { ANTIGRAVITY_SOURCE } from '../antigravity/payload.ts';
import {
  resolveCodexHome,
  resolveCodexMarketplaceCacheDir,
} from '../codex/marketplace-install.ts';
import { CODEX_SOURCE } from '../codex/payload.ts';
import { CURSOR_SOURCE } from '../cursor/payload.ts';
import { CLAUDE_SOURCE } from './payload.ts';

/**
 * The tools known to run a Claude bundle; each value is that tool's telemetry `source` id.
 *
 * @public
 */
export const CLAUDE_BUNDLE_HOSTS = [
  ANTIGRAVITY_SOURCE,
  CLAUDE_SOURCE,
  CODEX_SOURCE,
  CURSOR_SOURCE,
] as const;

/** @public */
export type ClaudeBundleHost = (typeof CLAUDE_BUNDLE_HOSTS)[number];

/** @public */
export interface ClaudeBundleHostContext {
  readonly env: NodeJS.ProcessEnv;
  readonly homeDir: string;
  /** The running script, absolute (`process.argv[1]`). */
  readonly scriptPath: string | undefined;
}

/** True when `scriptPath` lives strictly inside `dir`. */
const scriptIsInside = (
  dir: string | undefined,
  scriptPath: string | undefined,
): boolean => {
  const root = dir?.trim();
  if (!root || !scriptPath) {
    return false;
  }
  return isPathInside(root, scriptPath);
};

/**
 * Cursor sets `CURSOR_PLUGIN_ROOT` and `CLAUDE_PLUGIN_ROOT` to the same directory for a plugin
 * hook; Claude Code never sets the first. Requiring both to agree, with the script under them,
 * rules out a `CURSOR_PLUGIN_ROOT` that leaked in from somewhere else.
 */
const isCursorHost = ({
  env,
  scriptPath,
}: ClaudeBundleHostContext): boolean => {
  const cursorRoot = env.CURSOR_PLUGIN_ROOT?.trim();
  const claudeRoot = env.CLAUDE_PLUGIN_ROOT?.trim();
  if (!cursorRoot || !claudeRoot) {
    return false;
  }
  return (
    path.resolve(cursorRoot) === path.resolve(claudeRoot) &&
    scriptIsInside(cursorRoot, scriptPath)
  );
};

/**
 * The tool running this Claude bundle, first match wins: a script under agy's plugins directory;
 * a script under codex's marketplace cache; Cursor's plugin-root pair; otherwise Claude Code.
 *
 * @public
 */
export const detectClaudeBundleHost = ({
  env = process.env,
  homeDir = os.homedir(),
  scriptPath = process.argv[1],
}: Partial<ClaudeBundleHostContext> = {}): ClaudeBundleHost => {
  const context = { env, homeDir, scriptPath };
  if (scriptIsInside(resolveAntigravityPluginsDir(homeDir), scriptPath)) {
    return ANTIGRAVITY_SOURCE;
  }
  const codexCache = resolveCodexMarketplaceCacheDir(
    resolveCodexHome(env, homeDir),
  );
  if (scriptIsInside(codexCache, scriptPath)) {
    return CODEX_SOURCE;
  }
  if (isCursorHost(context)) {
    return CURSOR_SOURCE;
  }
  return CLAUDE_SOURCE;
};

/**
 * The launch directory a host hands its hooks. Cursor sets `CURSOR_PROJECT_DIR`; codex runs a hook
 * in the session's cwd; agy runs it in the plugin folder, which is no checkout, so the repository
 * comes from the payload's `cwd` instead. `CLAUDE_PROJECT_DIR` is ignored for the other hosts — it
 * may be inherited from a Claude Code session that launched them.
 *
 * @public
 */
export const resolveBundleHostProjectDir = (
  host: ClaudeBundleHost,
  env: NodeJS.ProcessEnv = process.env,
): string => {
  if (host === CLAUDE_SOURCE) {
    return (
      env.CLAUDE_PROJECT_DIR || env.OPEN_THROTTLE_REPO_ROOT || process.cwd()
    );
  }
  if (host === CURSOR_SOURCE && env.CURSOR_PROJECT_DIR) {
    return env.CURSOR_PROJECT_DIR;
  }
  return env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
};
