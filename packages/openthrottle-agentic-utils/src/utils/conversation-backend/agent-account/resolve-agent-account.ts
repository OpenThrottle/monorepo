/**
 * `resolveAgentAccount(provider, { env })` — which login a run under `env` is
 * billed to, for every driver that can tell us. Usage writers call it once per
 * turn, so results are cached per (provider, identity-relevant env) for a short
 * TTL: a burst of turns spawns at most one status probe, while a re-login is
 * picked up within a minute. It never rejects; any failure is `unattributed`.
 */

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  ALL_DRIVERS,
  resolveDriverBinary,
} from '@openthrottle/openthrottle-drivers';

import type { ClaudeAuthStatus } from '../claude/auth-status.ts';
import { probeClaudeAuthStatus } from '../claude/auth-status.ts';
import {
  toAntigravityAgentAccount,
  toClaudeAgentAccount,
  toCodexAgentAccount,
  toCursorAgentAccount,
} from './parse.ts';
import type {
  AgentAccountIdentity,
  ResolveAgentAccountOptions,
} from './types.ts';
import { AGENT_ACCOUNT_UNATTRIBUTED_REASONS } from './types.ts';

/** @public */
export const AGENT_ACCOUNT_CACHE_TTL_MS = 60_000;

/** @public */
export const AGENT_ACCOUNT_PROBE_TIMEOUT_MS = 5_000;

/**
 * Env keys that change which account a driver reports. Only their values (or,
 * for API keys, their presence) enter the cache key — never a key value.
 */
const IDENTITY_ENV_KEYS = [
  'CLAUDE_CONFIG_DIR',
  'CODEX_HOME',
  'HOME',
  'OPENTHROTTLE_CLAUDE_BIN',
  'OPENTHROTTLE_CURSOR_AGENT_BIN',
] as const;
const PRESENCE_ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'CURSOR_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
] as const;

/**
 * @public
 * @description The IO the resolver performs, injectable for tests.
 */
export interface AgentAccountResolverDeps {
  readonly now: () => number;
  readonly probeClaude: (
    env: NodeJS.ProcessEnv,
  ) => Promise<ClaudeAuthStatus | null>;
  /** Contents of a file, or null when it is missing or unreadable. */
  readonly readTextFile: (path: string) => Promise<string | null>;
  /** Stdout of `<binary> <args>`, or null on spawn failure or timeout. */
  readonly runStatus: (
    binary: string,
    args: readonly string[],
    env: NodeJS.ProcessEnv,
  ) => Promise<string | null>;
  readonly ttlMs: number;
}

/** @public */
export interface AgentAccountResolver {
  readonly resolve: (
    provider: string,
    options: ResolveAgentAccountOptions,
  ) => Promise<AgentAccountIdentity>;
}

interface CacheEntry {
  readonly expiresAt: number;
  readonly value: Promise<AgentAccountIdentity>;
}

function hasValue(env: NodeJS.ProcessEnv, key: string): boolean {
  const value = env[key];
  return value !== undefined && value.trim() !== '';
}

function homeOf(env: NodeJS.ProcessEnv): string {
  const home = env.HOME;
  return home !== undefined && home !== '' ? home : homedir();
}

function cacheKey(provider: string, env: NodeJS.ProcessEnv): string {
  const values = IDENTITY_ENV_KEYS.map((key) => env[key] ?? '');
  const presence = PRESENCE_ENV_KEYS.map((key) => hasValue(env, key));

  return JSON.stringify([provider, values, presence]);
}

function binaryFor(driverId: string, env: NodeJS.ProcessEnv): string | null {
  const driver = ALL_DRIVERS.find((candidate) => candidate.id === driverId);
  return driver === undefined ? null : resolveDriverBinary(driver, env);
}

async function readTextFileOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

function runStatusCommand(
  binary: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): Promise<string | null> {
  return new Promise((resolve) => {
    let stdout = '';

    const child = spawn(binary, [...args], {
      env: { HOME: env.HOME, PATH: env.PATH },
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve(null);
    }, AGENT_ACCOUNT_PROBE_TIMEOUT_MS);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString('utf8');
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });

    child.on('close', () => {
      clearTimeout(timer);
      resolve(stdout);
    });
  });
}

/**
 * @public
 * @description The production IO: real spawns, real files, wall-clock time.
 */
export function defaultAgentAccountResolverDeps(): AgentAccountResolverDeps {
  return {
    now: Date.now,
    probeClaude: (env) => {
      const binary = binaryFor('claude', env) ?? 'claude';
      return probeClaudeAuthStatus({
        binary,
        env,
        timeoutMs: AGENT_ACCOUNT_PROBE_TIMEOUT_MS,
      });
    },
    readTextFile: readTextFileOrNull,
    runStatus: runStatusCommand,
    ttlMs: AGENT_ACCOUNT_CACHE_TTL_MS,
  };
}

async function lookup(
  deps: AgentAccountResolverDeps,
  provider: string,
  env: NodeJS.ProcessEnv,
): Promise<AgentAccountIdentity> {
  switch (provider) {
    case 'antigravity': {
      const hasApiKey =
        hasValue(env, 'GEMINI_API_KEY') || hasValue(env, 'GOOGLE_API_KEY');
      const accounts = await deps.readTextFile(
        join(homeOf(env), '.gemini', 'google_accounts.json'),
      );
      return toAntigravityAgentAccount(accounts, hasApiKey);
    }
    case 'claude':
      return toClaudeAgentAccount(await deps.probeClaude(env));
    case 'codex': {
      const codexHome = env.CODEX_HOME ?? join(homeOf(env), '.codex');
      return toCodexAgentAccount(
        await deps.readTextFile(join(codexHome, 'auth.json')),
      );
    }
    case 'cursor': {
      const binary = binaryFor('cursor', env) ?? 'cursor-agent';
      const stdout = await deps.runStatus(binary, ['status'], env);
      return toCursorAgentAccount(stdout, hasValue(env, 'CURSOR_API_KEY'));
    }
    case 'grok':
    case 'openai':
    case 'opencode':
      // grok has no status/whoami command; opencode and the OpenAI HTTP path
      // hold per-provider keys with no account identity to report.
      return {
        kind: 'unattributed',
        provider,
        reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.unsupported,
      };
    default:
      return {
        kind: 'unattributed',
        provider,
        reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.unknownProvider,
      };
  }
}

/**
 * @public
 * @description A resolver with its own cache. Tests build one with stub deps; production code
 * uses {@link resolveAgentAccount}.
 */
export function createAgentAccountResolver(
  deps: AgentAccountResolverDeps,
): AgentAccountResolver {
  const cache = new Map<string, CacheEntry>();

  return {
    resolve: (provider, options) => {
      const normalized = provider.trim().toLowerCase();
      const key = cacheKey(normalized, options.env);
      const now = deps.now();
      const cached = cache.get(key);

      if (cached !== undefined && cached.expiresAt > now) {
        return cached.value;
      }

      const value = lookup(deps, normalized, options.env).catch(
        (): AgentAccountIdentity => {
          return {
            kind: 'unattributed',
            provider: normalized,
            reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.probeFailed,
          };
        },
      );
      cache.set(key, { expiresAt: now + deps.ttlMs, value });

      return value;
    },
  };
}

let defaultResolver: AgentAccountResolver | null = null;

/**
 * @public
 * @description Which agent account a run of `provider` under `options.env` is billed to. Cached
 * process-wide for {@link AGENT_ACCOUNT_CACHE_TTL_MS}; never rejects.
 */
export function resolveAgentAccount(
  provider: string,
  options: ResolveAgentAccountOptions,
): Promise<AgentAccountIdentity> {
  defaultResolver ??= createAgentAccountResolver(
    defaultAgentAccountResolverDeps(),
  );

  return defaultResolver.resolve(provider, options);
}
