/**
 * Env + git resolution.
 *
 * In a `home` repo this prefers the worktree `.env` for OT URL/auth, so a stale
 * parent shell (wrong port / pre-mutation schema) can't divert capture away
 * from this repo. Explicit SKILL_USAGE_* overrides still win.
 *
 * In a `foreign` repo the `<repoRoot>/.env` legs are **disabled** — reading an
 * arbitrary user's `.env` to find a server is both a privacy violation and a
 * correctness bug, and a hostile repo could otherwise point the operator's
 * telemetry at an endpoint of its choosing just by committing an `.env`. The
 * permitted sources there are the explicit overrides, the process env (how leg
 * B supplies it), and `~/.openthrottle/hooks.json` (how leg A does). See
 * `docs/monorepo/child-repo-hook-telemetry-contract.md` §2.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  readOperatorConfig,
  REPO_PROFILES,
  resolveRepoProfile,
} from './profile';
import { logHookError } from '../utils/logging';

/**
 * Resolve the current git branch for `repoRoot`. Fail-open → '' on any error.
 *
 * @public
 */
export const resolveGitBranch = (repoRoot: string): string => {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    }).trim();
  } catch {
    return '';
  }
};

/**
 * Parse repo `.env` into a plain object (no process.env mutation).
 *
 * @public
 */
export const readRepoEnvFile = (repoRoot: string): Record<string, string> => {
  const out: Record<string, string> = {};
  try {
    const envPath = path.join(repoRoot, '.env');
    if (!fs.existsSync(envPath)) {
      return out;
    }
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eq = trimmed.indexOf('=');
      if (eq <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      if (!key) {
        continue;
      }
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
  } catch (err) {
    logHookError('readRepoEnvFile failed', err);
  }
  return out;
};

/**
 * Load KEY=VALUE pairs from repo `.env` into process.env without overriding
 * keys already set (fill-in for missing keys only).
 *
 * **No-op in a `foreign` repo.** This is the broadest of the `.env` readers —
 * it imports every key, not just the OT ones — so running it against someone
 * else's checkout would pull their entire `.env` into the hook's environment.
 * It currently has no callers, and the gate is here so that adding one later
 * cannot reintroduce the leak §2 exists to prevent.
 *
 * @public
 */
export const loadRepoEnv = (repoRoot: string): void => {
  if (resolveRepoProfile(repoRoot) !== REPO_PROFILES.HOME) {
    return;
  }
  try {
    const fileEnv = readRepoEnvFile(repoRoot);
    for (const [key, value] of Object.entries(fileEnv)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (err) {
    logHookError('loadRepoEnv failed', err);
  }
};

/**
 * Map an OT env key onto its `~/.openthrottle/hooks.json` field. The config is
 * a small hand-written file, so it takes friendly names rather than making the
 * operator type `OPENTHROTTLE_MCP_AUTH_TOKEN` into JSON.
 */
const OPERATOR_CONFIG_KEYS: Readonly<Record<string, string>> = Object.freeze({
  OPENTHROTTLE_GRAPHQL_URL: 'graphqlUrl',
  OPENTHROTTLE_MCP_AUTH_TOKEN: 'authToken',
  OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN: 'authToken',
});

/** Value for an OT env key from the operator's machine-global config, or ''. */
const operatorConfigValue = (key: string): string => {
  const field = OPERATOR_CONFIG_KEYS[key];
  if (field === undefined) {
    return '';
  }
  const value = readOperatorConfig()[field];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
};

/**
 * Resolve one OT env value, preferring SKILL_USAGE_* overrides, then the
 * worktree `.env` (`home` only), then process.env, then the operator's
 * machine-global `~/.openthrottle/hooks.json`.
 *
 * @public
 */
export const resolveOtEnv = (
  repoRoot: string | undefined,
  key: string,
): string => {
  const skillOverride =
    key === 'OPENTHROTTLE_GRAPHQL_URL'
      ? process.env.SKILL_USAGE_GRAPHQL_URL
      : key === 'OPENTHROTTLE_MCP_AUTH_TOKEN'
        ? process.env.SKILL_USAGE_AUTH_TOKEN
        : undefined;
  if (skillOverride && skillOverride.trim()) {
    return skillOverride.trim();
  }

  if (repoRoot && resolveRepoProfile(repoRoot) === REPO_PROFILES.HOME) {
    const fromFile = readRepoEnvFile(repoRoot)[key];
    if (fromFile && fromFile.trim()) {
      return fromFile.trim();
    }
  }

  const fromProcess = process.env[key];
  if (fromProcess && fromProcess.trim()) {
    return fromProcess.trim();
  }

  return operatorConfigValue(key);
};

/**
 * Build a graphql URL from an env map (file or process).
 *
 * @public
 */
export const graphqlUrlFromEnvMap = (
  env: Record<string, string | undefined>,
): string | null => {
  const explicit =
    env.OPENTHROTTLE_GRAPHQL_URL?.trim() ||
    env.OPENTHROTTLE_WORKER_GRAPHQL_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const appUrl = env.OPENTHROTTLE_SERVER_APP_URL?.trim()?.replace(/\/$/, '');
  if (appUrl) {
    return `${appUrl}/graphql`;
  }
  return null;
};

/**
 * Resolve the GraphQL endpoint (same order as workflows). In `home` repos it
 * prefers the worktree `.env` chain so a stale parent URL can't beat this
 * worktree's APP_URL; in `foreign` repos that leg is skipped entirely and the
 * operator's `~/.openthrottle/hooks.json` is the last resort.
 *
 * @public
 */
export const resolveGraphqlUrl = (repoRoot?: string): string | null => {
  const skillOverride = process.env.SKILL_USAGE_GRAPHQL_URL?.trim();
  if (skillOverride) {
    return skillOverride.replace(/\/$/, '');
  }

  if (repoRoot && resolveRepoProfile(repoRoot) === REPO_PROFILES.HOME) {
    const fromFile = graphqlUrlFromEnvMap(readRepoEnvFile(repoRoot));
    if (fromFile) {
      return fromFile;
    }
  }

  const fromProcess = graphqlUrlFromEnvMap(process.env);
  if (fromProcess) {
    return fromProcess;
  }

  const fromOperator = operatorConfigValue('OPENTHROTTLE_GRAPHQL_URL');
  return fromOperator ? fromOperator.replace(/\/$/, '') : null;
};

/**
 * Auth token for ingest (service account or worker token).
 *
 * @public
 */
export const resolveAuthToken = (repoRoot?: string): string =>
  resolveOtEnv(repoRoot, 'OPENTHROTTLE_MCP_AUTH_TOKEN') ||
  resolveOtEnv(repoRoot, 'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN') ||
  '';
