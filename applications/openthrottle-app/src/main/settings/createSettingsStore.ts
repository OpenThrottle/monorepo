import { dirname } from 'node:path';

import { SETTINGS_VERSION } from '../data/data.settings.ts';
import { normalizeServerUrl } from '../utils/normalizeServerUrl.ts';

/** The filesystem calls the store needs; injected so tests need no disk. */
export interface SettingsFs {
  readonly mkdir: (path: string) => Promise<void>;
  readonly readFile: (path: string) => Promise<string>;
  readonly rename: (from: string, to: string) => Promise<void>;
  readonly writeFile: (path: string, contents: string) => Promise<void>;
}

export interface Settings {
  /** The persisted OT server origin, or `undefined` before first run. */
  readonly serverUrl: string | undefined;
}

export type WriteSettingsResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: string };

export interface SettingsStore {
  readonly read: () => Promise<Settings>;
  readonly write: (settings: Settings) => Promise<WriteSettingsResult>;
}

export interface CreateSettingsStoreOptions {
  readonly filePath: string;
  readonly fs: SettingsFs;
  /** Suffix keeping the temp file unique per process. */
  readonly tempSuffix: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parseSettings = (raw: string): Settings => {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed) || parsed['version'] !== SETTINGS_VERSION) {
      return { serverUrl: undefined };
    }

    const normalized = normalizeServerUrl(parsed['serverUrl']);

    return { serverUrl: normalized.ok ? normalized.url : undefined };
  } catch {
    return { serverUrl: undefined };
  }
};

const describeError = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

/**
 * @description Reads and writes `settings.json` (`{ version: 1, serverUrl }`).
 * A missing, unreadable, corrupt or wrong-version file reads as "nothing
 * configured" and never throws. Writes go to a temp file first and are then
 * renamed over the target, so a crash can never leave a half-written file.
 */
export const createSettingsStore = (
  options: CreateSettingsStoreOptions,
): SettingsStore => {
  const { filePath, fs, tempSuffix } = options;

  const read = async (): Promise<Settings> => {
    try {
      return parseSettings(await fs.readFile(filePath));
    } catch {
      return { serverUrl: undefined };
    }
  };

  const write = async (settings: Settings): Promise<WriteSettingsResult> => {
    const normalized = normalizeServerUrl(settings.serverUrl);

    if (!normalized.ok) {
      return { ok: false, reason: normalized.reason };
    }

    const tempPath = `${filePath}.${tempSuffix}.tmp`;
    const contents = JSON.stringify(
      { serverUrl: normalized.url, version: SETTINGS_VERSION },
      null,
      2,
    );

    try {
      await fs.mkdir(dirname(filePath));
      await fs.writeFile(tempPath, contents);
      await fs.rename(tempPath, filePath);

      return { ok: true };
    } catch (error) {
      return { ok: false, reason: describeError(error) };
    }
  };

  return { read, write };
};
