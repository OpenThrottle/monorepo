/**
 * Discovery for agentic CLI backends. The allowlist is DERIVED from the
 * `@openthrottle/openthrottle-drivers` registry (`ALL_DRIVERS`) so it can never
 * drift from the driver set — every driver (incl. codex and grok) is probed.
 * Only registry binaries are ever spawned (the safety invariant is now
 * guaranteed by construction). For each available driver we also enumerate the
 * models it can run via the driver's `discoverModels` descriptor.
 */

import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { DriverModelListing } from '@openthrottle/openthrottle-drivers';
import {
  ALL_DRIVERS,
  resolveDriverBinary,
} from '@openthrottle/openthrottle-drivers';

import type { ChatBackendCapabilities } from './capabilities.ts';
import { resolveChatBackendCapabilities } from './capabilities.ts';
import type { ClaudeAuthStatus } from './claude/auth-status.ts';
import { probeClaudeAuthStatus } from './claude/auth-status.ts';

/**
 * A supported agent CLI in the allowlist, projected from a registry driver.
 */
export interface AgentCliDescriptor {
  /**
   * True when the CLI resolves the workspace's committed MCP config, so a run in this checkout can
   * reach `openthrottle-mcp`. NOT the same as emitting MCP flags — see
   * `DriverCapabilities.attachesWorkspaceMcp`.
   */
  readonly attachesWorkspaceMcp: boolean;
  /** Backend discriminator — the driver id (also a `DriverId`). */
  readonly backend: string;
  /** Env var holding an absolute path override for the binary, when set. */
  readonly binEnv?: string;
  /** Binary name resolved off PATH (unless the env override is set). */
  readonly binary: string;
  /** True when the driver has a wired streaming chat backend (chat-composer capable). */
  readonly chatCapable: boolean;
  /** How to enumerate this CLI's models; undefined ⇒ availability-only. */
  readonly discoverModels?: DriverModelListing;
  /** Human-readable label for the selector. */
  readonly label: string;
  /**
   * True when the driver can be pointed at a custom OpenAI-compatible base URL (a discovered local
   * endpoint). The composer offers driver×endpoint targeting only for these; false drivers
   * (claude/cursor) speak their own cloud wire protocol.
   */
  readonly supportsCustomBaseUrl: boolean;
  /** Args probing presence + version (default `['--version']`). */
  readonly versionArgs: readonly string[];
}

/**
 * Generic authentication status of an agent CLI, independent of the backend.
 *
 * @public
 */
export const AGENT_CLI_AUTH_STATUSES = {
  authenticated: 'authenticated',
  unauthenticated: 'unauthenticated',
  unknown: 'unknown',
} as const;

/**
 * @public
 */
export type AgentCliAuthStatus =
  (typeof AGENT_CLI_AUTH_STATUSES)[keyof typeof AGENT_CLI_AUTH_STATUSES];

/**
 * Whether an agent CLI is logged in, with a short human-readable detail when
 * the probe has one. No credential contents are ever read.
 *
 * @public
 */
export interface AgentCliAuthState {
  /** Short explanation (e.g. the account), or null when there is none. */
  readonly detail: string | null;
  /** Authenticated, unauthenticated, or unknown when the backend is not probed. */
  readonly status: AgentCliAuthStatus;
}

/**
 * Outcome of probing one allowlisted CLI.
 */
export interface AgentCliAvailability {
  /** True when the CLI resolves the workspace's committed MCP config (see {@link AgentCliDescriptor}). */
  readonly attachesWorkspaceMcp: boolean;
  /**
   * Logged-in account, plan and active credential, from `claude auth status`
   * (no tokens read). Non-null only for an available claude whose probe parsed.
   */
  readonly auth: ClaudeAuthStatus | null;
  /** Generic login state; unknown for backends that are not probed. */
  readonly authState: AgentCliAuthState;
  /** True when the binary is present and its version probe exited cleanly. */
  readonly available: boolean;
  /** Backend discriminator (driver id). */
  readonly backend: string;
  /** Behavioral capabilities of this backend's chat path (read these, not backend names). */
  readonly capabilities: ChatBackendCapabilities;
  /** True when the driver can be offered as a streaming chat backend. */
  readonly chatCapable: boolean;
  /** Human-readable label. */
  readonly label: string;
  /** Models this CLI can run (empty when unavailable, undiscoverable, or on listing failure). */
  readonly models: readonly string[];
  /** True when this driver can target a custom OpenAI-compatible base URL (a discovered endpoint). */
  readonly supportsCustomBaseUrl: boolean;
  /**
   * True when the version probe or the model listing hit its timeout. A timeout means a slow or
   * loaded host, not a missing binary, so `available` / `models` are NOT authoritative for this
   * entry: a consumer holding an earlier snapshot of the same backend should keep that instead.
   */
  readonly timedOut: boolean;
  /** Trimmed version output when available, else null. */
  readonly version: string | null;
}

/**
 * Result of one agent-CLI discovery scan.
 */
export interface AgentCliDiscoveryResult {
  /** Every allowlisted CLI with its probed availability. */
  readonly agents: readonly AgentCliAvailability[];
  /** ISO-8601 scan timestamp (caller-stamped, else current time). */
  readonly scannedAt: string;
}

/**
 * Options for {@link discoverAgentClis}.
 */
export interface DiscoverAgentClisOptions {
  /** Environment used to resolve binary overrides (defaults to process.env). */
  readonly env?: NodeJS.ProcessEnv;
  /** Per model-listing timeout in ms (default 5000). */
  readonly modelListTimeoutMs?: number;
  /** Per-version-probe timeout in ms (default 3000). */
  readonly probeTimeoutMs?: number;
  /** ISO-8601 scan timestamp; defaults to now when omitted. */
  readonly scannedAt?: string;
}

/**
 * Allowlist of supported agent CLIs, projected from the drivers registry. Only
 * these binaries are ever probed or spawned. Each `backend` is the driver id;
 * probing is uniform (`<binary> <versionArgs>`). Derived from `ALL_DRIVERS`, so
 * adding a driver automatically adds it to discovery.
 *
 * @public
 */
export const AGENT_CLI_ALLOWLIST: readonly AgentCliDescriptor[] =
  ALL_DRIVERS.map((driver) => ({
    attachesWorkspaceMcp: driver.capabilities.attachesWorkspaceMcp,
    backend: driver.id,
    binEnv: driver.binEnv,
    binary: driver.binary,
    chatCapable: driver.capabilities.chatStreaming,
    discoverModels: driver.discoverModels,
    label: driver.label,
    supportsCustomBaseUrl: driver.capabilities.supportsCustomBaseUrl,
    versionArgs: driver.versionArgs,
  }));

/** A model listing, flagged when it was cut short by its timeout. */
interface ModelListing {
  readonly models: readonly string[];
  readonly timedOut: boolean;
}

const NO_MODELS: ModelListing = { models: [], timedOut: false };

/**
 * Enumerate a driver's models. Static descriptors resolve without spawning;
 * command descriptors spawn `<binary> <argv>` and map stdout through the pure
 * `parse`. Tolerant: any failure (missing binary, non-zero exit, timeout, parse
 * throw) degrades to `[]` and never rejects; a timeout is flagged so the caller
 * can tell "lists no models" from "was too slow to say".
 */
function listModels(
  descriptor: AgentCliDescriptor,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<ModelListing> {
  const listing = descriptor.discoverModels;

  if (listing === undefined) {
    return Promise.resolve(NO_MODELS);
  }

  if (listing.mode === 'static') {
    return Promise.resolve({ models: listing.models, timedOut: false });
  }

  return new Promise((resolve) => {
    let stdout = '';

    const child = spawn(
      resolveDriverBinary(descriptor, env),
      [...listing.argv],
      {
        env: { HOME: env.HOME, PATH: env.PATH },
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ models: [], timedOut: true });
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString('utf8');
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve(NO_MODELS);
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        resolve(NO_MODELS);
        return;
      }

      try {
        resolve({ models: listing.parse(stdout), timedOut: false });
      } catch {
        resolve(NO_MODELS);
      }
    });
  });
}

const UNKNOWN_AUTH_STATE: AgentCliAuthState = {
  detail: null,
  status: AGENT_CLI_AUTH_STATUSES.unknown,
};

function probe(
  descriptor: AgentCliDescriptor,
  env: NodeJS.ProcessEnv,
  probeTimeoutMs: number,
  modelListTimeoutMs: number,
): Promise<AgentCliAvailability> {
  return new Promise((resolve) => {
    const {
      attachesWorkspaceMcp,
      backend,
      chatCapable,
      label,
      supportsCustomBaseUrl,
    } = descriptor;

    let stdout = '';
    const unavailable: AgentCliAvailability = {
      attachesWorkspaceMcp,
      auth: null,
      authState: UNKNOWN_AUTH_STATE,
      available: false,
      backend,
      capabilities: resolveChatBackendCapabilities(backend, env),
      chatCapable,
      label,
      models: [],
      supportsCustomBaseUrl,
      timedOut: false,
      version: null,
    };

    const child = spawn(
      resolveDriverBinary(descriptor, env),
      [...descriptor.versionArgs],
      {
        env: { HOME: env.HOME, PATH: env.PATH },
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ ...unavailable, timedOut: true });
    }, probeTimeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString('utf8');
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve(unavailable);
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        resolve(unavailable);
        return;
      }

      const version = stdout.trim() === '' ? null : stdout.trim();

      // Availability is independent of model-listing success.
      listModels(descriptor, env, modelListTimeoutMs).then((listing) => {
        resolve({
          attachesWorkspaceMcp,
          auth: null,
          authState: UNKNOWN_AUTH_STATE,
          available: true,
          backend,
          capabilities: resolveChatBackendCapabilities(backend, env),
          chatCapable,
          label,
          models: listing.models,
          supportsCustomBaseUrl,
          timedOut: listing.timedOut,
          version,
        });
      });
    });
  });
}

const CLAUDE_BACKEND = 'claude';
const CURSOR_BACKEND = 'cursor';
const GEMINI_BACKEND = 'gemini';
const AUTH_DETAIL_MAX_CHARS = 200;

function claudeAuthState(auth: ClaudeAuthStatus | null): AgentCliAuthState {
  if (auth === null) {
    return UNKNOWN_AUTH_STATE;
  }

  if (!auth.loggedIn) {
    return {
      detail: auth.warning,
      status: AGENT_CLI_AUTH_STATUSES.unauthenticated,
    };
  }

  return {
    detail: auth.accountEmail,
    status: AGENT_CLI_AUTH_STATUSES.authenticated,
  };
}

/**
 * Run `<binary> <args>` with the same scrubbed env and timeout as the version
 * probe. Resolves the exit code and stdout; never rejects (a spawn error or a
 * timeout resolves `code: null`).
 */
function runProbe(
  binary: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<{ readonly code: number | null; readonly stdout: string }> {
  return new Promise((resolve) => {
    let stdout = '';

    const child = spawn(binary, [...args], {
      env: { HOME: env.HOME, PATH: env.PATH },
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: null, stdout });
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString('utf8');
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve({ code: null, stdout });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout });
    });
  });
}

/** `cursor-agent status`: "Not logged in" or a non-zero exit is unauthenticated; unrecognised output is unknown. */
async function probeCursorAuthState(
  descriptor: AgentCliDescriptor,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<AgentCliAuthState> {
  const { code, stdout } = await runProbe(
    resolveDriverBinary(descriptor, env),
    ['status'],
    env,
    timeoutMs,
  );
  const output = stdout.trim();
  const firstLine = output.split('\n')[0]?.trim() ?? '';
  const detail =
    firstLine === '' ? null : firstLine.slice(0, AUTH_DETAIL_MAX_CHARS);

  if (code !== 0 || /not logged in/i.test(output)) {
    return { detail, status: AGENT_CLI_AUTH_STATUSES.unauthenticated };
  }

  if (/logged in/i.test(output)) {
    return { detail, status: AGENT_CLI_AUTH_STATUSES.authenticated };
  }

  return { detail, status: AGENT_CLI_AUTH_STATUSES.unknown };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function hasValue(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== '';
}

/** gemini: an API key in the env, or the cached login file's existence (never its contents). */
async function probeGeminiAuthState(
  env: NodeJS.ProcessEnv,
): Promise<AgentCliAuthState> {
  if (hasValue(env.GEMINI_API_KEY)) {
    return {
      detail: 'GEMINI_API_KEY is set',
      status: AGENT_CLI_AUTH_STATUSES.authenticated,
    };
  }

  if (hasValue(env.GOOGLE_API_KEY)) {
    return {
      detail: 'GOOGLE_API_KEY is set',
      status: AGENT_CLI_AUTH_STATUSES.authenticated,
    };
  }

  const home = env.HOME;

  if (
    hasValue(home) &&
    (await fileExists(join(home ?? '', '.gemini', 'oauth_creds.json')))
  ) {
    return {
      detail: 'Google login cached',
      status: AGENT_CLI_AUTH_STATUSES.authenticated,
    };
  }

  return { detail: null, status: AGENT_CLI_AUTH_STATUSES.unauthenticated };
}

/**
 * Probe one CLI. The claude `auth status`, cursor `status` and gemini
 * credential checks run concurrently with the version probe; their results are
 * kept only when the binary is available. Every other entry has an unknown
 * `authState` and `auth: null`. The auth probes never reject.
 */
async function probeWithAuth(
  descriptor: AgentCliDescriptor,
  env: NodeJS.ProcessEnv,
  probeTimeoutMs: number,
  modelListTimeoutMs: number,
): Promise<AgentCliAvailability> {
  const availabilityPromise = probe(
    descriptor,
    env,
    probeTimeoutMs,
    modelListTimeoutMs,
  );

  if (descriptor.backend === CURSOR_BACKEND) {
    const [availability, authState] = await Promise.all([
      availabilityPromise,
      probeCursorAuthState(descriptor, env, probeTimeoutMs),
    ]);

    return availability.available
      ? { ...availability, authState }
      : availability;
  }

  if (descriptor.backend === GEMINI_BACKEND) {
    const [availability, authState] = await Promise.all([
      availabilityPromise,
      probeGeminiAuthState(env),
    ]);

    return availability.available
      ? { ...availability, authState }
      : availability;
  }

  if (descriptor.backend !== CLAUDE_BACKEND) {
    return availabilityPromise;
  }

  const [availability, auth] = await Promise.all([
    availabilityPromise,
    probeClaudeAuthStatus({
      binary: resolveDriverBinary(descriptor, env),
      env,
      timeoutMs: probeTimeoutMs,
    }),
  ]);

  return availability.available
    ? { ...availability, auth, authState: claudeAuthState(auth) }
    : availability;
}

/**
 * Probe every allowlisted agent CLI for availability + per-driver models. For
 * claude it also reports the account, plan and active credential via
 * `claude auth status` (never reading tokens); claude, cursor and gemini report
 * a generic `authState`, and every entry reports its chat `capabilities`.
 *
 * @public
 */
export async function discoverAgentClis(
  options: DiscoverAgentClisOptions = {},
): Promise<AgentCliDiscoveryResult> {
  const env = options.env ?? process.env;
  const probeTimeoutMs = options.probeTimeoutMs ?? 3000;
  const modelListTimeoutMs = options.modelListTimeoutMs ?? 5000;
  const agents = await Promise.all(
    AGENT_CLI_ALLOWLIST.map((descriptor) =>
      probeWithAuth(descriptor, env, probeTimeoutMs, modelListTimeoutMs),
    ),
  );

  return {
    agents,
    scannedAt: options.scannedAt ?? new Date().toISOString(),
  };
}
