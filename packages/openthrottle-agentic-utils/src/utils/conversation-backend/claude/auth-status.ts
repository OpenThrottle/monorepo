/**
 * Reports which Claude credential a chat/run spawn would use, via the
 * documented `claude auth status --json` command. No OAuth token or credential
 * file is ever read and no Anthropic endpoint is called here: the CLI itself
 * reports the account, plan and key source. The `ANTHROPIC_API_KEY` VALUE is
 * never passed to the probe child or surfaced — only its presence, as a boolean.
 */

import { spawn } from 'node:child_process';

import {
  CLAUDE_CONFIG_DIR_KEY,
  CLAUDE_HOST_ENV_KEYS,
  resolveEffectiveClaudeConfigDir,
} from './config-dir.ts';
import {
  CLAUDE_NOT_LOGGED_IN_WARNING,
  claudeApiKeyOverrideWarning,
} from './data/data.copy.ts';

/**
 * Which credential Claude runs will bill.
 *
 * @public
 */
export const CLAUDE_ACTIVE_CREDENTIALS = {
  apiKey: 'apiKey',
  none: 'none',
  subscription: 'subscription',
} as const;

/**
 * @public
 */
export type ClaudeActiveCredential =
  (typeof CLAUDE_ACTIVE_CREDENTIALS)[keyof typeof CLAUDE_ACTIVE_CREDENTIALS];

/**
 * The logged-in account, plan and active credential as reported by
 * `claude auth status --json`.
 *
 * @public
 */
export interface ClaudeAuthStatus {
  /** Logged-in account email, when reported. */
  readonly accountEmail: string | null;
  /** The credential Claude runs will actually bill. */
  readonly activeCredential: ClaudeActiveCredential;
  /** True when an API key is active AND a subscription login exists (the key wins in `-p` mode). */
  readonly apiKeyOverridesSubscription: boolean;
  /** Login method, e.g. `claude.ai`, when reported. */
  readonly authMethod: string | null;
  /** True when `claude auth status` reports a logged-in account. */
  readonly loggedIn: boolean;
  /** Organization name, when reported. */
  readonly organizationName: string | null;
  /** Subscription plan (`pro`, `max`, `team`, ...), when reported. */
  readonly subscriptionType: string | null;
  /** A loud, specific sentence when the credential setup needs attention, else null. */
  readonly warning: string | null;
}

/**
 * What the caller knows about the server environment the chat child inherits.
 *
 * @public
 */
export interface ClaudeAuthStatusEnv {
  /** True when `ANTHROPIC_API_KEY` is set (the chat child inherits it). */
  readonly hasAnthropicApiKey: boolean;
}

/**
 * Options for {@link probeClaudeAuthStatus}.
 *
 * @public
 */
export interface ProbeClaudeAuthStatusOptions {
  /** Resolved claude binary (honours `OPENTHROTTLE_CLAUDE_BIN`). */
  readonly binary: string;
  /** Server environment: source of HOME/PATH, the config dir and key presence. */
  readonly env: NodeJS.ProcessEnv;
  /** Kill the probe after this many ms. */
  readonly timeoutMs: number;
}

const API_KEY_ENV_NAME = 'ANTHROPIC_API_KEY';
const CLAUDE_AI_AUTH_METHOD = 'claude.ai';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(stdout: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(stdout);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** An active API key always wins over a subscription in `-p` mode. */
function resolveActiveCredential(
  apiKeyActive: boolean,
  hasSubscription: boolean,
): ClaudeActiveCredential {
  if (apiKeyActive) {
    return CLAUDE_ACTIVE_CREDENTIALS.apiKey;
  }

  if (hasSubscription) {
    return CLAUDE_ACTIVE_CREDENTIALS.subscription;
  }

  return CLAUDE_ACTIVE_CREDENTIALS.none;
}

/**
 * Pure projection of `claude auth status --json` stdout. Every field is
 * treated as optional/untrusted; garbage input yields a not-logged-in status.
 *
 * @public
 */
export function parseClaudeAuthStatus(
  stdout: string,
  env: ClaudeAuthStatusEnv,
): ClaudeAuthStatus {
  const record = readRecord(stdout) ?? {};
  const loggedIn = record.loggedIn === true;
  const authMethod = readString(record, 'authMethod');
  const subscriptionType = readString(record, 'subscriptionType');
  const apiKeySource = readString(record, 'apiKeySource');
  const reportedKeySource =
    apiKeySource !== null && apiKeySource !== 'none' ? apiKeySource : null;
  const hasSubscription =
    loggedIn &&
    authMethod === CLAUDE_AI_AUTH_METHOD &&
    subscriptionType !== null;
  const apiKeyActive = env.hasAnthropicApiKey || reportedKeySource !== null;
  const activeCredential = resolveActiveCredential(
    apiKeyActive,
    hasSubscription,
  );
  const apiKeyOverridesSubscription = apiKeyActive && hasSubscription;
  const cliKeySource = env.hasAnthropicApiKey ? null : reportedKeySource;
  const keySource = cliKeySource ?? API_KEY_ENV_NAME;

  let warning: string | null = null;
  if (apiKeyOverridesSubscription) {
    warning = claudeApiKeyOverrideWarning(subscriptionType, keySource);
  } else if (activeCredential === CLAUDE_ACTIVE_CREDENTIALS.none) {
    warning = CLAUDE_NOT_LOGGED_IN_WARNING;
  }

  return {
    accountEmail: readString(record, 'email'),
    activeCredential,
    apiKeyOverridesSubscription,
    authMethod,
    loggedIn,
    organizationName: readString(record, 'orgName'),
    subscriptionType,
    warning,
  };
}

/**
 * Spawn `claude auth status --json` (arg array, no shell) and project it.
 * The child env is the chat spawn's host allowlist ({@link CLAUDE_HOST_ENV_KEYS})
 * plus the resolved config dir, so it sees the same login a chat turn would —
 * `ANTHROPIC_API_KEY` is deliberately NOT forwarded. Resolves null on spawn
 * failure, timeout, or unparseable output; discovery never fails because of it.
 * A non-zero exit still parses (claude exits non-zero when logged out).
 *
 * @public
 */
export function probeClaudeAuthStatus(
  options: ProbeClaudeAuthStatusOptions,
): Promise<ClaudeAuthStatus | null> {
  const { binary, env, timeoutMs } = options;
  const configDir = resolveEffectiveClaudeConfigDir(env);
  const apiKey = env[API_KEY_ENV_NAME];
  const hasAnthropicApiKey = apiKey !== undefined && apiKey.trim() !== '';

  return new Promise((resolve) => {
    let stdout = '';

    const childEnv: NodeJS.ProcessEnv = {};
    for (const key of CLAUDE_HOST_ENV_KEYS) {
      if (env[key] !== undefined) {
        childEnv[key] = env[key];
      }
    }
    if (configDir !== undefined) {
      childEnv[CLAUDE_CONFIG_DIR_KEY] = configDir;
    }

    const child = spawn(binary, ['auth', 'status', '--json'], {
      env: childEnv,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve(null);
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString('utf8');
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });

    child.on('close', () => {
      clearTimeout(timer);
      if (readRecord(stdout) === null) {
        resolve(null);
        return;
      }

      resolve(parseClaudeAuthStatus(stdout, { hasAnthropicApiKey }));
    });
  });
}
