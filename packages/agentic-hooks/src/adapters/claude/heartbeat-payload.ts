/**
 * Pure half of the Claude Code coverage heartbeat (contract §8): delivery-leg detection, the
 * marketplace-install read, and the GraphQL input. No I/O, so every row of the contract's tables is
 * testable without a filesystem or a process. `heartbeat-run.ts` does the reading and the sending.
 */
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import type { BufferStats } from '../../data/readBufferStats.ts';

/** The one mutation this hook sends. */
export const RECORD_TELEMETRY_HEARTBEAT_MUTATION = `
mutation RecordTelemetryHeartbeat($input: RecordTelemetryHeartbeatInput!) {
  recordTelemetryHeartbeat(input: $input) {
    id
  }
}
`;

/** Key of this plugin in Claude Code's `installed_plugins.json`. */
const MARKETPLACE_PLUGIN_KEY = 'openthrottle@openthrottle';

/** Longest machine label sent; the server column is bounded. */
const MAX_MACHINE_LABEL_LENGTH = 64;

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
 * Claude Code's config directory: `CLAUDE_CONFIG_DIR` when set, else `~/.claude`.
 *
 * @public
 */
export const resolveClaudeConfigDir = (
  env: NodeJS.ProcessEnv,
  homeDir: string,
): string => {
  const configured = env.CLAUDE_CONFIG_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(homeDir, '.claude');
};

const isInside = (parent: string, child: string): boolean => {
  const relative = path.relative(parent, child);
  return (
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  );
};

/**
 * Which delivery leg this process is running under (contract §8, first match wins):
 * the driver's `OPENTHROTTLE_HOOK_DELIVERY=plugin-dir` stamp; a plugin root under
 * `<claude config dir>/plugins/cache/` (marketplace); any other plugin root (a hand-passed
 * `--plugin-dir`); no plugin root (the repo's own settings).
 *
 * @public
 */
export const detectDeliveryLeg = ({
  env,
  homeDir,
}: {
  readonly env: NodeJS.ProcessEnv;
  readonly homeDir: string;
}): DeliveryLeg => {
  if (env.OPENTHROTTLE_HOOK_DELIVERY?.trim() === 'plugin-dir') {
    return 'plugin-dir';
  }
  const pluginRoot = env.CLAUDE_PLUGIN_ROOT?.trim();
  if (!pluginRoot) {
    return 'repo';
  }
  const cacheDir = path.join(
    resolveClaudeConfigDir(env, homeDir),
    'plugins',
    'cache',
  );
  return isInside(cacheDir, path.resolve(pluginRoot))
    ? 'marketplace'
    : 'plugin-dir';
};

/**
 * Read the marketplace plugin out of `installed_plugins.json`'s text. `null` text (file unreadable)
 * and text whose shape is not recognized are both "unknown"; a readable file without the key is a
 * definite "not installed".
 *
 * @public
 */
export const parseMarketplaceInstall = (
  rawJson: string | null,
): MarketplaceInstall => {
  const unknown: MarketplaceInstall = { installed: null, version: null };
  if (rawJson === null) {
    return unknown;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return unknown;
  }
  if (!isRecord(parsed) || !isRecord(parsed.plugins)) {
    return unknown;
  }
  const entries = parsed.plugins[MARKETPLACE_PLUGIN_KEY];
  if (entries === undefined) {
    return { installed: false, version: null };
  }
  if (!Array.isArray(entries)) {
    return unknown;
  }
  const [first] = entries;
  if (first === undefined) {
    return { installed: false, version: null };
  }
  const entryVersion = isRecord(first) ? first.version : null;
  const hasVersion = typeof entryVersion === 'string' && entryVersion !== '';
  return { installed: true, version: hasVersion ? entryVersion : null };
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
