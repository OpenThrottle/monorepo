/**
 * Env + git resolution. Prefers the worktree `.env` for OT URL/auth so a stale
 * parent shell (wrong port / pre-mutation schema) can't divert capture away
 * from this repo. Explicit SKILL_USAGE_* overrides still win.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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
 * @public
 */
export const loadRepoEnv = (repoRoot: string): void => {
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
 * Resolve one OT env value, preferring SKILL_USAGE_* overrides, then the
 * worktree `.env`, then process.env.
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

  if (repoRoot) {
    const fromFile = readRepoEnvFile(repoRoot)[key];
    if (fromFile && fromFile.trim()) {
      return fromFile.trim();
    }
  }

  const fromProcess = process.env[key];
  return fromProcess && fromProcess.trim() ? fromProcess.trim() : '';
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
 * Resolve the GraphQL endpoint (same order as workflows). Prefers the worktree
 * `.env` chain so a stale parent URL can't beat this worktree's APP_URL.
 *
 * @public
 */
export const resolveGraphqlUrl = (repoRoot?: string): string | null => {
  const skillOverride = process.env.SKILL_USAGE_GRAPHQL_URL?.trim();
  if (skillOverride) {
    return skillOverride.replace(/\/$/, '');
  }

  if (repoRoot) {
    const fromFile = graphqlUrlFromEnvMap(readRepoEnvFile(repoRoot));
    if (fromFile) {
      return fromFile;
    }
  }

  return graphqlUrlFromEnvMap(process.env);
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
