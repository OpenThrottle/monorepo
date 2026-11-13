/**
 * Impure half of the Claude Code coverage heartbeat (contract §8): resolve the machine id, the git
 * remote and the plugin facts, post once, and leave a `last-heartbeat.json` receipt. Kept apart from
 * the entrypoint so it can be exercised without `process.exit`.
 *
 * Fail-open and quiet: no endpoint, or `OPENTHROTTLE_TELEMETRY_OFFLINE=1`, sends nothing and says
 * nothing; a resolvable-but-unreachable endpoint costs at most one stderr line. A heartbeat is never
 * buffered — it would describe a moment that is already stale. Nothing is written inside the
 * repository: the machine id and the receipt live under `~/.openthrottle/`.
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  resolveAuthToken,
  resolveGraphqlUrl,
  resolveOtEnv,
  userConfigDir,
} from '../../config/env.ts';
import { postGraphqlMutation } from '../../data/graphql.ts';
import { resolveTelemetryDir } from '../../data/jsonl.ts';
import { DEFAULT_POST_TIMEOUT_MS } from '../../data/persist.ts';
import { readBufferStats } from '../../data/readBufferStats.ts';
import type { HookFetch } from '../../types.ts';
import { logHookError } from '../../utils/logging.ts';
import { normalizeRemoteUrl } from '../../utils/normalizeRemoteUrl.ts';
import {
  buildHeartbeatInput,
  detectDeliveryLeg,
  parseMarketplaceInstall,
  readVersionField,
  RECORD_TELEMETRY_HEARTBEAT_MUTATION,
  resolveClaudeConfigDir,
  sanitizeMachineLabel,
  type TelemetryHeartbeatInput,
} from './heartbeat-payload.ts';
import { CLAUDE_SOURCE } from './payload.ts';

const MACHINE_ID_BASENAME = 'machine-id';
export const LAST_HEARTBEAT_BASENAME = 'last-heartbeat.json';
const GIT_TIMEOUT_MS = 1000;
const SAFE_MACHINE_ID = /^[A-Za-z0-9-]{8,64}$/;

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

const readTextOrNull = (filePath: string): string | null => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
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

/** `remote.origin.url` of the checkout, normalized client-side; null when absent or unusable. */
const resolveRepoIdentity = (repoRoot: string): string | null => {
  try {
    const remote = execFileSync(
      'git',
      ['config', '--get', 'remote.origin.url'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: GIT_TIMEOUT_MS,
      },
    );
    return normalizeRemoteUrl(remote);
  } catch {
    return null;
  }
};

/** The running payload's own version, or null outside a plugin. */
const resolvePluginVersion = (env: NodeJS.ProcessEnv): string | null => {
  const pluginRoot = env.CLAUDE_PLUGIN_ROOT?.trim();
  if (!pluginRoot) {
    return null;
  }
  for (const manifest of [
    path.join(pluginRoot, '.claude-plugin', 'plugin.json'),
    path.join(pluginRoot, 'plugin.json'),
  ]) {
    const raw = readTextOrNull(manifest);
    const version = raw === null ? null : readVersionField(raw);
    if (version !== null) {
      return version;
    }
  }
  return null;
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
 * Gather the facts, post one heartbeat, record the receipt. Never throws. Returns the receipt, or
 * null when no heartbeat could be built (no machine id).
 *
 * @public
 */
export const runHeartbeat = async ({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  repoRoot,
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
}: {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: HookFetch;
  readonly now?: () => Date;
  readonly repoRoot: string;
  readonly timeoutMs?: number;
}): Promise<HeartbeatReceipt | null> => {
  try {
    const machineId = resolveMachineId();
    if (machineId === null) {
      return null;
    }

    const homeDir = os.homedir();
    const marketplaceRaw = readTextOrNull(
      path.join(
        resolveClaudeConfigDir(env, homeDir),
        'plugins',
        'installed_plugins.json',
      ),
    );
    const attemptedAt = now();
    const payload = buildHeartbeatInput({
      bufferStats: readBufferStats(),
      deliveryLeg: detectDeliveryLeg({ env, homeDir }),
      machineId,
      machineLabel: sanitizeMachineLabel(
        resolveOtEnv(repoRoot, 'OPENTHROTTLE_MACHINE_LABEL'),
      ),
      marketplace: parseMarketplaceInstall(marketplaceRaw),
      now: attemptedAt,
      pluginVersion: resolvePluginVersion(env),
      repoIdentity: resolveRepoIdentity(repoRoot),
      source: CLAUDE_SOURCE,
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
