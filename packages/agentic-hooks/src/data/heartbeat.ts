/**
 * The tool-neutral half of the coverage heartbeat (docs/monorepo/child-repo-hook-telemetry-contract.md
 * §8): one small record per session start saying which machine, through which delivery leg, in which
 * repo, with what sitting in the local telemetry buffer.
 *
 * Everything a second producer would otherwise duplicate lives here — the input shape, the machine
 * id, the send, the receipt. An adapter supplies only what is genuinely its tool's: its `source`
 * id, which delivery leg it is running under, and what it knows about a marketplace install.
 *
 * Fail-open and quiet: no endpoint, or `OPENTHROTTLE_TELEMETRY_OFFLINE=1`, sends nothing and says
 * nothing; a resolvable-but-unreachable endpoint costs at most one stderr line. A heartbeat is never
 * buffered — it would describe a moment that is already stale. Nothing is written inside the
 * repository: the machine id and the receipt live under `~/.openthrottle/`.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import {
  resolveAuthToken,
  resolveGraphqlUrl,
  resolveOtEnv,
  resolveRepoIdentity,
  userConfigDir,
} from '../config/env.ts';
import type { HookFetch } from '../types.ts';
import { logHookError } from '../utils/logging.ts';
import { postGraphqlMutation } from './graphql.ts';
import { resolveTelemetryDir } from './jsonl.ts';
import { DEFAULT_POST_TIMEOUT_MS } from './persist.ts';
import type { BufferStats } from './readBufferStats.ts';
import { readBufferStats } from './readBufferStats.ts';

/** The one mutation a heartbeat sends. */
export const RECORD_TELEMETRY_HEARTBEAT_MUTATION = `
mutation RecordTelemetryHeartbeat($input: RecordTelemetryHeartbeatInput!) {
  recordTelemetryHeartbeat(input: $input) {
    id
  }
}
`;

/** Longest machine label sent; the server column is bounded. */
const MAX_MACHINE_LABEL_LENGTH = 64;

const MACHINE_ID_BASENAME = 'machine-id';

/** @public */
export const LAST_HEARTBEAT_BASENAME = 'last-heartbeat.json';

const SAFE_MACHINE_ID = /^[A-Za-z0-9-]{8,64}$/;

/** The stamp a driver sets on a process it passed a plugin directory to. */
const HOOK_DELIVERY_ENV = 'OPENTHROTTLE_HOOK_DELIVERY';

/**
 * How the hooks reached the session.
 *
 * @public
 */
export const DELIVERY_LEGS = ['marketplace', 'plugin-dir', 'repo'] as const;

/** @public */
export type DeliveryLeg = (typeof DELIVERY_LEGS)[number];

/**
 * What the marketplace install looks like on this machine. `installed: null` means unknown.
 *
 * @public
 */
export interface MarketplaceInstall {
  readonly installed: boolean | null;
  readonly version: string | null;
}

/** "Nothing is known about a marketplace install" — for a tool with no readable install record. */
export const UNKNOWN_MARKETPLACE_INSTALL: MarketplaceInstall = Object.freeze({
  installed: null,
  version: null,
});

/**
 * The `recordTelemetryHeartbeat` input. Counts, ids and timestamps only — no path, hostname, email,
 * username or token has a field to ride in.
 *
 * @public
 */
export interface TelemetryHeartbeatInput {
  readonly bufferedEvents: number;
  readonly bufferedOutcomes: number;
  readonly bufferedTokenUsage: number;
  readonly bufferedTrajectories: number;
  readonly deadLetterCount: number;
  readonly deliveryLeg: DeliveryLeg;
  readonly machineId: string;
  readonly machineLabel: string | null;
  readonly marketplacePluginInstalled: boolean | null;
  readonly marketplacePluginVersion: string | null;
  readonly occurredAt: string;
  readonly oldestBufferedAt: string | null;
  readonly pluginVersion: string | null;
  readonly repoIdentity: string | null;
  readonly source: string;
}

/**
 * What the last attempt left in `last-heartbeat.json`.
 *
 * @public
 */
export interface HeartbeatReceipt {
  readonly attemptedAt: string;
  readonly delivered: boolean;
  readonly error: string | null;
  readonly payload: TelemetryHeartbeatInput;
}

/** True when `child` is strictly inside `parent`. */
export const isPathInside = (parent: string, child: string): boolean => {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return (
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  );
};

/**
 * Which delivery leg a hook process is running under, first match wins: the driver's
 * `OPENTHROTTLE_HOOK_DELIVERY=plugin-dir` stamp; no plugin root (the repo's own registration); a
 * plugin root under the tool's marketplace cache directory; any other plugin root (a hand-passed
 * `--plugin-dir`). An adapter passes `pluginRoot: null` when it cannot show the running script
 * belongs to the plugin root its tool exported.
 *
 * @public
 */
export const detectDeliveryLeg = ({
  env,
  marketplaceCacheDir,
  pluginRoot,
}: {
  readonly env: NodeJS.ProcessEnv;
  /** Where the tool unpacks marketplace installs, or null when it has none we know of. */
  readonly marketplaceCacheDir: string | null;
  readonly pluginRoot: string | null;
}): DeliveryLeg => {
  if (env[HOOK_DELIVERY_ENV]?.trim() === 'plugin-dir') {
    return 'plugin-dir';
  }
  const root = pluginRoot?.trim();
  if (!root) {
    return 'repo';
  }
  if (marketplaceCacheDir !== null && isPathInside(marketplaceCacheDir, root)) {
    return 'marketplace';
  }
  return 'plugin-dir';
};

/**
 * The delivery leg for a tool with no plugin-root variable, read from where the running script
 * lives: the driver's `OPENTHROTTLE_HOOK_DELIVERY=plugin-dir` stamp wins; a script inside the
 * repository is that repository's own registration (`repo`); a script anywhere else was pointed at
 * by out-of-repo config the operator wrote by hand, which is leg B in shape (`plugin-dir`).
 *
 * @public
 */
export const detectDeliveryLegFromScript = ({
  env,
  marketplaceCacheDir,
  repoRoot,
  scriptPath,
}: {
  readonly env: NodeJS.ProcessEnv;
  /** Where the tool unpacks marketplace installs; a script under it is `marketplace`. */
  readonly marketplaceCacheDir: string | null;
  readonly repoRoot: string;
  readonly scriptPath: string | undefined;
}): DeliveryLeg => {
  const outsideRepo =
    scriptPath !== undefined && !isPathInside(repoRoot, scriptPath);
  return detectDeliveryLeg({
    env,
    marketplaceCacheDir,
    pluginRoot: outsideRepo ? path.dirname(scriptPath) : null,
  });
};

/**
 * The `cwd` a hook payload's JSON text reports, or null when absent, empty or unparsable.
 *
 * @public
 */
export const readHookPayloadCwd = (stdin: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(stdin);
    if (isRecord(parsed) && typeof parsed.cwd === 'string' && parsed.cwd) {
      return parsed.cwd;
    }
  } catch {
    // An empty or malformed payload just means no cwd; the heartbeat does not need one.
  }
  return null;
};

/**
 * Whole stdin, or '' when there is none to read.
 *
 * @public
 */
export const readHookStdin = (): string => {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

/**
 * The operator's opt-in machine label: trimmed, at most 64 characters, else null.
 *
 * @public
 */
export const sanitizeMachineLabel = (raw: string): string | null => {
  const trimmed = raw.trim().slice(0, MAX_MACHINE_LABEL_LENGTH).trim();
  return trimmed === '' ? null : trimmed;
};

/** Read a manifest's `version` out of its JSON text. */
export const readVersionField = (rawJson: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!isRecord(parsed) || typeof parsed.version !== 'string') {
      return null;
    }
    return parsed.version.trim() || null;
  } catch {
    return null;
  }
};

/** A file's text, or null when it cannot be read. */
export const readTextOrNull = (filePath: string): string | null => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
};

/**
 * The first readable `version` among a plugin's candidate manifests, or null.
 *
 * @public
 */
export const readFirstManifestVersion = (
  manifestPaths: readonly string[],
): string | null => {
  for (const manifest of manifestPaths) {
    const raw = readTextOrNull(manifest);
    const version = raw === null ? null : readVersionField(raw);
    if (version !== null) {
      return version;
    }
  }
  return null;
};

/**
 * True when `dirPath` is a directory this process can list.
 *
 * @public
 */
export const isReadableDirectory = (dirPath: string): boolean => {
  try {
    fs.readdirSync(dirPath);
    return true;
  } catch {
    return false;
  }
};

/**
 * The directories directly inside `dirPath`, most recently modified first; empty when `dirPath`
 * cannot be listed. A tool that keeps one directory per installed version or commit unpacks the
 * current one last, so the head of this list is the live install.
 *
 * @public
 */
export const listSubdirectoriesNewestFirst = (
  dirPath: string,
): readonly string[] => {
  let names: readonly string[];
  try {
    names = fs.readdirSync(dirPath);
  } catch {
    return [];
  }
  const dirs: { readonly dir: string; readonly mtimeMs: number }[] = [];
  for (const name of names) {
    const dir = path.join(dirPath, name);
    try {
      const stat = fs.statSync(dir);
      if (stat.isDirectory()) {
        dirs.push({ dir, mtimeMs: stat.mtimeMs });
      }
    } catch {
      // A directory removed mid-listing is simply not an install.
    }
  }
  return dirs
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .map((entry) => entry.dir);
};

/**
 * Assemble the heartbeat input from already-gathered facts.
 *
 * @public
 */
export const buildHeartbeatInput = ({
  bufferStats,
  deliveryLeg,
  machineId,
  machineLabel,
  marketplace,
  now,
  pluginVersion,
  repoIdentity,
  source,
}: {
  readonly bufferStats: BufferStats;
  readonly deliveryLeg: DeliveryLeg;
  readonly machineId: string;
  readonly machineLabel: string | null;
  readonly marketplace: MarketplaceInstall;
  readonly now: Date;
  readonly pluginVersion: string | null;
  readonly repoIdentity: string | null;
  readonly source: string;
}): TelemetryHeartbeatInput => {
  const countFor = (label: string): number => {
    return bufferStats.files.find((file) => file.label === label)?.lines ?? 0;
  };
  return {
    bufferedEvents: countFor('events'),
    bufferedOutcomes: countFor('outcomes'),
    bufferedTokenUsage: countFor('token-usage'),
    bufferedTrajectories: countFor('trajectories'),
    deadLetterCount: bufferStats.totalDeadLetterLines,
    deliveryLeg,
    machineId,
    machineLabel,
    marketplacePluginInstalled: marketplace.installed,
    marketplacePluginVersion: marketplace.version,
    occurredAt: now.toISOString(),
    oldestBufferedAt: bufferStats.oldestAt,
    pluginVersion,
    repoIdentity,
    source,
  };
};

/**
 * The random per-machine id in `~/.openthrottle/machine-id`, created (0600) on first use. Null when
 * it can neither be read nor written, in which case the heartbeat is skipped.
 *
 * @public
 */
export const resolveMachineId = (): string | null => {
  const idPath = path.join(userConfigDir(), MACHINE_ID_BASENAME);
  const existing = readTextOrNull(idPath)?.trim() ?? '';
  if (SAFE_MACHINE_ID.test(existing)) {
    return existing;
  }
  try {
    fs.mkdirSync(path.dirname(idPath), { recursive: true });
    const created = crypto.randomUUID();
    fs.writeFileSync(idPath, `${created}\n`, { mode: 0o600 });
    return created;
  } catch {
    return null;
  }
};

const writeReceipt = (receipt: HeartbeatReceipt): void => {
  try {
    const receiptPath = path.join(
      resolveTelemetryDir(),
      LAST_HEARTBEAT_BASENAME,
    );
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  } catch {
    // The receipt is a convenience for the doctor; never let it fail the hook.
  }
};

/**
 * Gather the neutral facts, post one heartbeat, record the receipt. Never throws. Returns the
 * receipt, or null when no heartbeat could be built (no machine id).
 *
 * @public
 */
export const sendHeartbeat = async ({
  deliveryLeg,
  env = process.env,
  fetchImpl = globalThis.fetch,
  marketplace,
  now = () => new Date(),
  pluginVersion,
  repoRoot,
  resolveRepoIdentity: resolveIdentity = resolveRepoIdentity,
  source,
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
}: {
  readonly deliveryLeg: DeliveryLeg;
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: HookFetch;
  readonly marketplace: MarketplaceInstall;
  readonly now?: () => Date;
  readonly pluginVersion: string | null;
  readonly repoRoot: string;
  /** Seam for tests: the default spawns git with a deadline, which loses races under CPU load. */
  readonly resolveRepoIdentity?: (repoRoot: string) => string | null;
  readonly source: string;
  readonly timeoutMs?: number;
}): Promise<HeartbeatReceipt | null> => {
  try {
    const machineId = resolveMachineId();
    if (machineId === null) {
      return null;
    }

    const attemptedAt = now();
    const payload = buildHeartbeatInput({
      bufferStats: readBufferStats(),
      deliveryLeg,
      machineId,
      machineLabel: sanitizeMachineLabel(
        resolveOtEnv(repoRoot, 'OPENTHROTTLE_MACHINE_LABEL'),
      ),
      marketplace,
      now: attemptedAt,
      pluginVersion,
      repoIdentity: resolveIdentity(repoRoot),
      source,
    });

    const receiptBase = { attemptedAt: attemptedAt.toISOString(), payload };

    if (env.OPENTHROTTLE_TELEMETRY_OFFLINE === '1') {
      const receipt = { ...receiptBase, delivered: false, error: 'offline' };
      writeReceipt(receipt);
      return receipt;
    }

    const graphqlUrl = resolveGraphqlUrl(repoRoot);
    if (!graphqlUrl) {
      const receipt = {
        ...receiptBase,
        delivered: false,
        error: 'no endpoint',
      };
      writeReceipt(receipt);
      return receipt;
    }

    const result = await postGraphqlMutation({
      authToken: resolveAuthToken(repoRoot),
      fetchImpl,
      field: 'recordTelemetryHeartbeat',
      graphqlUrl,
      query: RECORD_TELEMETRY_HEARTBEAT_MUTATION,
      timeoutMs,
      variables: { input: payload },
    });

    if (result.ok) {
      const receipt = { ...receiptBase, delivered: true, error: null };
      writeReceipt(receipt);
      return receipt;
    }

    logHookError('heartbeat not delivered', result.reason);
    const receipt = { ...receiptBase, delivered: false, error: result.reason };
    writeReceipt(receipt);
    return receipt;
  } catch (err) {
    logHookError('heartbeat failed', err);
    return null;
  }
};
