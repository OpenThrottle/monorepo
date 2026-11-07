/**
 * Non-interactive install/update executor for the allowlisted agent CLIs. The ONLY caller input is a
 * `backend` id (validated against the `@openthrottle/openthrottle-drivers` registry) and a `mode`
 * (`install` | `update`); the command is built entirely from the driver's registry-defined
 * `install`/`update` descriptors — never from a URL or command supplied by the caller. This is the
 * single place a `curl | shell` installer is spawned, so it stays deliberately small and auditable.
 *
 * Safety invariants:
 * - Unknown / non-installable backends resolve a typed failure — they never spawn.
 * - Every run is bounded by a timeout (SIGTERM→SIGKILL) and honors an AbortSignal.
 * - Failures always resolve a typed result; the executor never rejects or leaves a dangling child.
 * - The child PATH is augmented with the common per-user install target dirs so a subsequent
 *   discovery scan can see a freshly installed binary (the `~/.local/bin` PATH gotcha).
 * - The child env is an allowlist (no server secrets) with `NO_COLOR=1` / `FORCE_COLOR=0` forced.
 */

import { spawn } from 'node:child_process';

import type { AgentDriver } from '@openthrottle/openthrottle-drivers';
import { getDriver, isDriverId } from '@openthrottle/openthrottle-drivers';

/** Default per-run wall-clock budget (10 minutes) before the child is force-killed. */
export const DEFAULT_AGENT_SETUP_TIMEOUT_MS = 600_000;

/** Grace period between SIGTERM and SIGKILL when a run is timed out or aborted. */
const KILL_GRACE_MS = 5_000;

/**
 * Per-user directories the curl|shell installers drop binaries into. Prepended to the child PATH so
 * post-install discovery resolves the new binary even if the server process started without them.
 */
const INSTALL_BIN_DIRS = [
  '.local/bin',
  '.bun/bin',
  '.cargo/bin',
  '.codex/bin',
  '.cursor/bin',
  '.deno/bin',
  '.grok/bin',
  '.opencode/bin',
  'bin',
] as const;

/**
 * Host env vars an installer may read. The child runs a script fetched from the internet
 * (`curl | shell`), so it gets an allowlist rather than the server's whole environment — database
 * URLs, API keys and session secrets never reach it.
 */
const ALLOWED_ENV_KEYS = [
  'ALL_PROXY',
  'CARGO_HOME', // rustup/cargo-based installers pick their prefix from it.
  'CODEX_HOME',
  'CURL_CA_BUNDLE',
  'HOME',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LOGNAME',
  'NO_PROXY',
  'NODE_EXTRA_CA_CERTS',
  'OPENCODE_INSTALL_DIR',
  'PATH',
  'SHELL',
  'SSL_CERT_DIR',
  'SSL_CERT_FILE',
  'TERM',
  'TMPDIR',
  'USER',
  'XDG_BIN_DIR',
  'XDG_CACHE_HOME',
  'XDG_CONFIG_HOME',
  'XDG_DATA_HOME',
  'all_proxy',
  'http_proxy',
  'https_proxy',
  'no_proxy',
] as const;

/**
 * Prefixes passed through wholesale: the package managers' own configuration (install prefix,
 * registry, tap). Dropping them would make `npm install --global` or `brew upgrade` behave
 * differently from the user's own terminal.
 */
const ALLOWED_ENV_PREFIXES = [
  'BUN_',
  'HOMEBREW_',
  'NPM_CONFIG_',
  'NVM_',
  'VOLTA_',
  'npm_config_',
] as const;

/**
 * Values forced on the child regardless of the host environment. Installers stream into a log the
 * user reads in the browser, so ask them for plain text: `NO_COLOR` is the cross-tool convention,
 * `FORCE_COLOR=0` covers the Node (chalk/supports-color) installers that ignore it. Not every
 * installer honors either, so the client still strips ANSI.
 */
const FORCED_ENV: Readonly<Record<string, string>> = {
  FORCE_COLOR: '0',
  NO_COLOR: '1',
};

/** Whether a run installs a missing CLI or updates an existing one. */
export type AgentSetupMode = 'install' | 'update';

/** Why a run failed (absent on success). */
export type AgentSetupFailureReason =
  | 'aborted'
  | 'non-zero-exit'
  | 'not-installable'
  | 'spawn-error'
  | 'timeout'
  | 'unknown-backend';

/** One chunk of subprocess output streamed while a run is in flight. */
export interface AgentSetupChunk {
  readonly data: string;
  readonly stream: 'stderr' | 'stdout';
}

/** Terminal outcome of an install/update run. */
export interface AgentSetupResult {
  /** The (validated) backend id this run targeted. */
  readonly backend: string;
  /** Wall-clock duration in ms. */
  readonly durationMs: number;
  /** Child exit code, or null when killed by signal / never spawned. */
  readonly exitCode: number | null;
  /** The mode that ran. */
  readonly mode: AgentSetupMode;
  /** True only when the child exited 0. */
  readonly ok: boolean;
  /** Failure classifier; undefined on success. */
  readonly reason?: AgentSetupFailureReason;
}

/** One stdout/stderr stream of a spawned child (the subset this executor consumes). */
interface AgentSetupChildStream {
  on(event: 'data', listener: (chunk: Buffer) => void): void;
}

/**
 * The narrow slice of a spawned child process this executor uses. A real `ChildProcess` satisfies it
 * structurally; tests supply a lightweight fake (no casts, no network installer).
 */
export interface AgentSetupChildProcess {
  kill(signal: NodeJS.Signals): void;
  on(event: 'close', listener: (code: number | null) => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
  readonly stderr: AgentSetupChildStream | null;
  readonly stdout: AgentSetupChildStream | null;
}

/**
 * Minimal spawn seam so tests can inject a fake child without executing a network installer. Matches
 * the shape {@link spawn} returns for the options this executor uses.
 */
export type AgentSetupSpawn = (
  file: string,
  args: readonly string[],
  options: { readonly env: NodeJS.ProcessEnv },
) => AgentSetupChildProcess;

/** Options for {@link runAgentSetup}. */
export interface RunAgentSetupOptions {
  /** Backend id — validated against the drivers registry; anything else fails closed. */
  readonly backend: string;
  /** Environment used for binary/PATH resolution (defaults to process.env). */
  readonly env?: NodeJS.ProcessEnv;
  /** Install a missing CLI or update an existing one. */
  readonly mode: AgentSetupMode;
  /** Per-chunk stdout/stderr callback. */
  readonly onChunk?: (chunk: AgentSetupChunk) => void;
  /** Abort the run (kills the child). */
  readonly signal?: AbortSignal;
  /** Spawn seam (defaults to node:child_process spawn). */
  readonly spawnFn?: AgentSetupSpawn;
  /** Per-run timeout in ms (default {@link DEFAULT_AGENT_SETUP_TIMEOUT_MS}). */
  readonly timeoutMs?: number;
}

/** A fixed, registry-derived command to execute (no caller input flows into this). */
interface ResolvedCommand {
  readonly args: readonly string[];
  readonly file: string;
}

function resolveBinary(driver: AgentDriver, env: NodeJS.ProcessEnv): string {
  const override =
    driver.binEnv !== undefined ? env[driver.binEnv]?.trim() : undefined;
  return override !== undefined && override !== '' ? override : driver.binary;
}

/**
 * PATH with the common per-user install dirs prepended (deduped, order-preserving) so a binary a
 * `curl|shell` installer just wrote is discoverable without restarting the server.
 */
export function augmentPathForInstall(env: NodeJS.ProcessEnv): string {
  const existing = env.PATH ?? '';
  const home = env.HOME?.trim();
  if (home === undefined || home === '') {
    return existing;
  }

  const ordered = [
    ...INSTALL_BIN_DIRS.map((dir) => `${home}/${dir}`),
    ...existing.split(':'),
  ];
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const part of ordered) {
    if (part !== '' && !seen.has(part)) {
      seen.add(part);
      deduped.push(part);
    }
  }
  return deduped.join(':');
}

/**
 * The child env: the allowlisted host vars, the install-augmented PATH, then {@link FORCED_ENV}
 * last so the host can never re-enable color.
 */
function buildAgentSetupEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const scrubbed: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    const allowed =
      ALLOWED_ENV_KEYS.some((allowedKey) => allowedKey === key) ||
      ALLOWED_ENV_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (value !== undefined && allowed) {
      scrubbed[key] = value;
    }
  }

  return { ...scrubbed, PATH: augmentPathForInstall(env), ...FORCED_ENV };
}

/**
 * Build the fixed command for a run from the driver's registry descriptors. A `curl-shell` install
 * (and `update` that falls back to re-running the installer) becomes `sh -c 'curl -fsSL <url> |
 * <shell>'`; an `npm` install becomes `npm install --global <packageName>`; a `command`-method
 * update becomes `<binary> <argv...>`. Returns null when the backend cannot be installed (no
 * `install` descriptor).
 */
export function buildAgentSetupCommand(
  driver: AgentDriver,
  mode: AgentSetupMode,
  env: NodeJS.ProcessEnv,
): ResolvedCommand | null {
  if (mode === 'update' && driver.update?.method === 'command') {
    return { args: [...driver.update.argv], file: resolveBinary(driver, env) };
  }

  // install, or update via reinstall / no explicit update descriptor → re-run the installer.
  const install = driver.install;
  if (install === undefined) {
    return null;
  }

  if (install.method === 'npm') {
    return { args: ['install', '--global', install.packageName], file: 'npm' };
  }

  const shellCommand = `curl -fsSL ${install.url} | ${install.installerShell}`;
  return { args: ['-c', shellCommand], file: 'sh' };
}

const defaultSpawn: AgentSetupSpawn = (file, args, options) => {
  return spawn(file, [...args], {
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
};

/**
 * Run an install/update for an allowlisted agent CLI, streaming output via `onChunk`. Fails closed
 * on unknown/non-installable backends and always resolves a typed {@link AgentSetupResult}.
 *
 * @public
 */
export function runAgentSetup(
  options: RunAgentSetupOptions,
): Promise<AgentSetupResult> {
  const { backend, mode, onChunk } = options;
  const env = options.env ?? process.env;
  const timeoutMs = options.timeoutMs ?? DEFAULT_AGENT_SETUP_TIMEOUT_MS;
  const spawnFn = options.spawnFn ?? defaultSpawn;
  const startedAt = Date.now();

  const fail = (
    reason: AgentSetupFailureReason,
    exitCode: number | null = null,
  ): AgentSetupResult => {
    return {
      backend,
      durationMs: Date.now() - startedAt,
      exitCode,
      mode,
      ok: false,
      reason,
    };
  };

  if (!isDriverId(backend)) {
    return Promise.resolve(fail('unknown-backend'));
  }
  const driver = getDriver(backend);
  const command = buildAgentSetupCommand(driver, mode, env);
  if (command === null) {
    return Promise.resolve(fail('not-installable'));
  }

  if (options.signal?.aborted === true) {
    return Promise.resolve(fail('aborted'));
  }

  return new Promise<AgentSetupResult>((resolve) => {
    let settled = false;
    const childEnv = buildAgentSetupEnv(env);

    let child: AgentSetupChildProcess;
    try {
      child = spawnFn(command.file, command.args, { env: childEnv });
    } catch {
      resolve(fail('spawn-error'));
      return;
    }

    const settle = (result: AgentSetupResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      options.signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };

    const forceKillAfterGrace = (): void => {
      child.kill('SIGTERM');
      killTimer = setTimeout(() => child.kill('SIGKILL'), KILL_GRACE_MS);
    };

    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      forceKillAfterGrace();
      settle(fail('timeout'));
    }, timeoutMs);

    const onAbort = (): void => {
      forceKillAfterGrace();
      settle(fail('aborted'));
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout?.on('data', (data: Buffer) => {
      onChunk?.({ data: data.toString('utf8'), stream: 'stdout' });
    });
    child.stderr?.on('data', (data: Buffer) => {
      onChunk?.({ data: data.toString('utf8'), stream: 'stderr' });
    });

    child.on('error', () => {
      settle(fail('spawn-error'));
    });

    child.on('close', (code) => {
      if (code === 0) {
        settle({
          backend,
          durationMs: Date.now() - startedAt,
          exitCode: 0,
          mode,
          ok: true,
        });
        return;
      }
      settle(fail('non-zero-exit', code));
    });
  });
}
