/**
 * Discovery for agentic CLI backends. The allowlist is DERIVED from the
 * `@openthrottle/openthrottle-drivers` registry (`ALL_DRIVERS`) so it can never
 * drift from the driver set — every driver (incl. codex and grok) is probed.
 * Only registry binaries are ever spawned (the safety invariant is now
 * guaranteed by construction). For each available driver we also enumerate the
 * models it can run via the driver's `discoverModels` descriptor.
 */

import { ALL_DRIVERS } from '@openthrottle/openthrottle-drivers';
import type { DriverModelListing } from '@openthrottle/openthrottle-drivers';
import { spawn } from 'node:child_process';

/**
 * A supported agent CLI in the allowlist, projected from a registry driver.
 */
export interface AgentCliDescriptor {
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
  /** Args probing presence + version (default `['--version']`). */
  readonly versionArgs: readonly string[];
}

/**
 * Outcome of probing one allowlisted CLI.
 */
export interface AgentCliAvailability {
  /** True when the binary is present and its version probe exited cleanly. */
  readonly available: boolean;
  /** Backend discriminator (driver id). */
  readonly backend: string;
  /** True when the driver can be offered as a streaming chat backend. */
  readonly chatCapable: boolean;
  /** Human-readable label. */
  readonly label: string;
  /** Models this CLI can run (empty when unavailable, undiscoverable, or on listing failure). */
  readonly models: readonly string[];
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
    backend: driver.id,
    binEnv: driver.binEnv,
    binary: driver.binary,
    chatCapable: driver.capabilities.chatStreaming,
    discoverModels: driver.discoverModels,
    label: driver.label,
    versionArgs: driver.versionArgs,
  }));

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

/**
 * Enumerate a driver's models. Static descriptors resolve without spawning;
 * command descriptors spawn `<binary> <argv>` and map stdout through the pure
 * `parse`. Tolerant: any failure (missing binary, non-zero exit, timeout, parse
 * throw) degrades to `[]` and never rejects.
 */
function listModels(
  descriptor: AgentCliDescriptor,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<readonly string[]> {
  const listing = descriptor.discoverModels;

  if (listing === undefined) {
    return Promise.resolve([]);
  }

  if (listing.mode === 'static') {
    return Promise.resolve(listing.models);
  }

  return new Promise((resolve) => {
    let stdout = '';

    const child = spawn(resolveBinary(descriptor, env), [...listing.argv], {
      env: { HOME: env.HOME, PATH: env.PATH },
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve([]);
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString('utf8');
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve([]);
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        resolve([]);
        return;
      }

      try {
        resolve(listing.parse(stdout));
      } catch {
        resolve([]);
      }
    });
  });
}

function probe(
  descriptor: AgentCliDescriptor,
  env: NodeJS.ProcessEnv,
  probeTimeoutMs: number,
  modelListTimeoutMs: number,
): Promise<AgentCliAvailability> {
  return new Promise((resolve) => {
    const { backend, chatCapable, label } = descriptor;

    let stdout = '';
    const unavailable: AgentCliAvailability = {
      available: false,
      backend,
      chatCapable,
      label,
      models: [],
      version: null,
    };

    const child = spawn(
      resolveBinary(descriptor, env),
      [...descriptor.versionArgs],
      {
        env: { HOME: env.HOME, PATH: env.PATH },
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );

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
      clearTimeout(timer);

      if (code !== 0) {
        resolve(unavailable);
        return;
      }

      const version = stdout.trim() === '' ? null : stdout.trim();

      // Availability is independent of model-listing success.
      listModels(descriptor, env, modelListTimeoutMs).then((models) => {
        resolve({
          available: true,
          backend,
          chatCapable,
          label,
          models,
          version,
        });
      });
    });
  });
}

/**
 * Probe every allowlisted agent CLI for availability + per-driver models.
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
      probe(descriptor, env, probeTimeoutMs, modelListTimeoutMs),
    ),
  );

  return {
    agents,
    scannedAt: options.scannedAt ?? new Date().toISOString(),
  };
}
