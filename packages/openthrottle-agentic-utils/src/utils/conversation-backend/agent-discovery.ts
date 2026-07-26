/**
 * Discovery for agentic CLI backends. Mirrors model-discovery, but an agent CLI
 * is a binary + availability (not endpoints × models): probe a hardcoded
 * allowlist for presence via `<binary> --version`. Only allowlisted binaries are
 * ever spawned. Cursor ships first; the list is structured to extend.
 */

import { spawn } from 'node:child_process';

import { CLAUDE_BIN_ENV } from './claude/argv.ts';
import { CURSOR_AGENT_BIN_ENV } from './cursor-agent/argv.ts';
import { OPENCODE_BIN_ENV } from './opencode/argv.ts';

/**
 * A supported agent CLI in the allowlist.
 */
export interface AgentCliDescriptor {
  /** Backend discriminator used end-to-end (matches the stream input). */
  readonly backend: string;
  /** Env var holding an absolute path override for the binary, when set. */
  readonly binEnv?: string;
  /** Binary name resolved off PATH (unless the env override is set). */
  readonly binary: string;
  /** Human-readable label for the selector. */
  readonly label: string;
}

/**
 * Outcome of probing one allowlisted CLI.
 */
export interface AgentCliAvailability {
  /** True when the binary is present and `--version` exited cleanly. */
  readonly available: boolean;
  /** Backend discriminator. */
  readonly backend: string;
  /** Human-readable label. */
  readonly label: string;
  /** Trimmed `--version` output when available, else null. */
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
  /** Per-probe timeout in ms (default 3000). */
  readonly probeTimeoutMs?: number;
  /** ISO-8601 scan timestamp; defaults to now when omitted. */
  readonly scannedAt?: string;
}

/**
 * Hardcoded allowlist of supported agent CLIs. Only these binaries are ever
 * probed or spawned. Each `backend` maps to a `ConversationBackend` adapter and
 * to the resolver's routing gate; probing is uniform (`<binary> --version`).
 *
 * @public
 */
export const AGENT_CLI_ALLOWLIST: readonly AgentCliDescriptor[] = [
  {
    backend: 'claude',
    binEnv: CLAUDE_BIN_ENV,
    binary: 'claude',
    label: 'Claude Code',
  },
  {
    backend: 'cursor',
    binEnv: CURSOR_AGENT_BIN_ENV,
    binary: 'cursor-agent',
    label: 'Cursor Agent',
  },
  {
    backend: 'opencode',
    binEnv: OPENCODE_BIN_ENV,
    binary: 'opencode',
    label: 'OpenCode',
  },
];

function resolveBinary(
  descriptor: AgentCliDescriptor,
  env: NodeJS.ProcessEnv,
): string {
  const override =
    descriptor.binEnv !== undefined
      ? env[descriptor.binEnv]?.trim()
      : undefined;

  return override !== undefined && override !== ''
    ? override
    : descriptor.binary;
}

function probe(
  descriptor: AgentCliDescriptor,
  env: NodeJS.ProcessEnv,
  probeTimeoutMs: number,
): Promise<AgentCliAvailability> {
  return new Promise((resolve) => {
    const { backend, label } = descriptor;

    let stdout = '';
    const unavailable: AgentCliAvailability = {
      available: false,
      backend,
      label,
      version: null,
    };

    const child = spawn(resolveBinary(descriptor, env), ['--version'], {
      env: { HOME: env.HOME, PATH: env.PATH },
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');

      resolve(unavailable);
    }, probeTimeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString('utf8');
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve(unavailable);
    });

    child.on('close', (code) => {
      const isSuccess = code === 0;

      clearTimeout(timer);

      if (!isSuccess) {
        resolve(unavailable);
      } else {
        const { backend, label } = descriptor;
        const version = stdout.trim() === '' ? null : stdout.trim();

        resolve({ available: true, backend, label, version });
      }
    });
  });
}

/**
 * Probe every allowlisted agent CLI for availability.
 *
 * @public
 */
export async function discoverAgentClis(
  options: DiscoverAgentClisOptions = {},
): Promise<AgentCliDiscoveryResult> {
  const env = options.env ?? process.env;
  const probeTimeoutMs = options.probeTimeoutMs ?? 3000;
  const agents = await Promise.all(
    AGENT_CLI_ALLOWLIST.map((descriptor) =>
      probe(descriptor, env, probeTimeoutMs),
    ),
  );

  return {
    agents,
    scannedAt: options.scannedAt ?? new Date().toISOString(),
  };
}
