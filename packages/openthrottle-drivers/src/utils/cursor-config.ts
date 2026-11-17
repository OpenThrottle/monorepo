/**
 * @description Run-scoped `cursor-agent` user config with commit and PR attribution switched off.
 *
 * cursor-agent decides whether to attribute commits and PRs to itself (the `Co-authored-by: Cursor`
 * trailer) from `attribution.attributeCommitsToAgent` / `attributePRsToAgent` in
 * `$CURSOR_CONFIG_DIR/cli-config.json`, both defaulting to `true`. It has no CLI flag for them, and a
 * project `.cursor/cli.json` cannot set them: its schema accepts `permissions` only (verified
 * against cursor-agent 2026.11.13-eacade1). So a spawned run is pointed at an OT-owned config dir
 * holding a copy of the user's config with attribution forced off, and the user's own file is
 * never written.
 *
 * Moving `CURSOR_CONFIG_DIR` moves only `cli-config.json` and a statsig cache. Login lives in the
 * OS keychain, and `mcp.json`, plugins, skills and per-project MCP approvals are read from
 * `~/.cursor` directly, so none of them change. The copy is re-seeded from the user's file on
 * every spawn, so their model and permission edits keep flowing through; anything cursor writes
 * back into the copy (a remembered allowlist entry) is dropped at the next spawn.
 */

import {
  chmodSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * @description The env var cursor-agent reads its user config directory from.
 * @public
 */
export const CURSOR_CONFIG_DIR_ENV = 'CURSOR_CONFIG_DIR';

/**
 * @description Overrides where the attribution-off config dir is written. Unset in normal use.
 * @public
 */
export const OPENTHROTTLE_CURSOR_CONFIG_DIR_ENV = `OPENTHROTTLE_CURSOR_CONFIG_DIR`;

const CLI_CONFIG_FILE = 'cli-config.json';

const ATTRIBUTION_OFF = {
  attributeCommitsToAgent: false,
  attributePRsToAgent: false,
} as const;

/**
 * @description The user config dir cursor-agent itself would use: `CURSOR_CONFIG_DIR`, else
 * `$XDG_CONFIG_HOME/cursor`, else `~/.cursor`. Mirrors cursor's own resolver.
 */
const resolveCursorUserConfigDir = (env: NodeJS.ProcessEnv): string => {
  const explicit = env[CURSOR_CONFIG_DIR_ENV]?.trim();
  if (explicit !== undefined && explicit !== '') {
    return explicit;
  }

  const xdg = env.XDG_CONFIG_HOME?.trim();
  if (xdg !== undefined && xdg !== '') {
    return join(xdg, 'cursor');
  }

  return join(homedir(), '.cursor');
};

/**
 * @description Where the attribution-off copy lives: the override env var, else
 * `~/.openthrottle/cursor-config`.
 */
const resolveTargetDir = (env: NodeJS.ProcessEnv): string => {
  const override = env[OPENTHROTTLE_CURSOR_CONFIG_DIR_ENV]?.trim();
  if (override !== undefined && override !== '') {
    return override;
  }

  return join(homedir(), '.openthrottle', 'cursor-config');
};

/**
 * @description Reads a JSON object from disk. A missing, unreadable or non-object file is `undefined`.
 */
const readJsonObject = (path: string): object | undefined => {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed;
    }

    return undefined;
  } catch {
    return undefined;
  }
};

/**
 * @description Best-effort removal of a leftover temp file; a failure here changes nothing.
 */
const removeQuietly = (path: string): void => {
  try {
    rmSync(path, { force: true });
  } catch {
    // The dir itself was unwritable, so there is no temp file to remove.
  }
};

/**
 * @description Writes the attribution-off `cli-config.json` into the run-scoped config dir and
 * returns that dir, for the caller to pass as `CURSOR_CONFIG_DIR`. The write is atomic, so
 * concurrent spawns never see a half-written file. Returns `undefined` when the dir cannot be
 * written; the caller then leaves `CURSOR_CONFIG_DIR` alone and the run falls back to the user's
 * config, where the commit-msg hook still strips the trailer.
 * @public
 */
export const prepareCursorConfigDir = (
  env: NodeJS.ProcessEnv,
): string | undefined => {
  const sourceDir = resolveCursorUserConfigDir(env);
  const targetDir = resolveTargetDir(env);
  const seed = readJsonObject(join(sourceDir, CLI_CONFIG_FILE)) ?? {
    version: 1,
  };
  const next = { ...seed, attribution: ATTRIBUTION_OFF };
  const targetFile = join(targetDir, CLI_CONFIG_FILE);
  const tempFile = `${targetFile}.${process.pid}.${Date.now()}.tmp`;

  try {
    mkdirSync(targetDir, { mode: 0o700, recursive: true });
    // The copy carries whatever the user's file does (cached account info included), so keep it
    // owner-only like the original.
    writeFileSync(tempFile, `${JSON.stringify(next, null, 2)}\n`, {
      mode: 0o600,
    });
    chmodSync(tempFile, 0o600);
    renameSync(tempFile, targetFile);
  } catch {
    removeQuietly(tempFile);
    return undefined;
  }

  return targetDir;
};

/**
 * @description The env a cursor-agent child needs on top of its inherited env: `CURSOR_CONFIG_DIR`
 * pointed at the attribution-off copy, or nothing when it could not be prepared.
 * @public
 */
export const cursorAttributionOffEnv = (
  env: NodeJS.ProcessEnv,
): Readonly<Record<string, string>> => {
  const configDir = prepareCursorConfigDir(env);

  return configDir === undefined ? {} : { [CURSOR_CONFIG_DIR_ENV]: configDir };
};
