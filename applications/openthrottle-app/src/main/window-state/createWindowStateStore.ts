import { dirname } from 'node:path';

import { WINDOW_STATE_VERSION } from '../data/data.window-state.ts';
import type { Rectangle } from './isBoundsVisible.ts';

/** Synchronous fs calls, injected so tests need no disk. Sync on purpose: the final save runs while the window closes. */
export interface WindowStateFs {
  readonly mkdir: (path: string) => void;
  readonly readFile: (path: string) => string;
  readonly rename: (from: string, to: string) => void;
  readonly writeFile: (path: string, contents: string) => void;
}

export interface WindowState {
  readonly bounds: Rectangle;
  readonly isMaximized: boolean;
}

export interface WindowStateStore {
  /** The saved state, or `undefined` when missing, unreadable, corrupt or the wrong version. */
  readonly read: () => WindowState | undefined;
  /** Atomic write (temp file, then rename); returns whether it succeeded. */
  readonly write: (state: WindowState) => boolean;
}

export interface CreateWindowStateStoreOptions {
  readonly filePath: string;
  readonly fs: WindowStateFs;
  /** Suffix keeping the temp file unique per process. */
  readonly tempSuffix: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isPositive = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
};

const isCoordinate = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const parse = (raw: string): WindowState | undefined => {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed) || parsed['version'] !== WINDOW_STATE_VERSION) {
      return undefined;
    }

    const { height, width, x, y } = parsed;

    if (!isPositive(height) || !isPositive(width)) {
      return undefined;
    }

    if (!isCoordinate(x) || !isCoordinate(y)) {
      return undefined;
    }

    return {
      bounds: { height, width, x, y },
      isMaximized: parsed['isMaximized'] === true,
    };
  } catch {
    return undefined;
  }
};

/**
 * @description Reads and writes `window-state.json`
 * (`{ version: 1, x, y, width, height, isMaximized }`). It lives beside, not
 * inside, `settings.json`: the settings schema and its tests stay untouched, and
 * a corrupt window file can never lose the saved server.
 */
export const createWindowStateStore = (
  options: CreateWindowStateStoreOptions,
): WindowStateStore => {
  const { filePath, fs, tempSuffix } = options;

  const read = (): WindowState | undefined => {
    try {
      return parse(fs.readFile(filePath));
    } catch {
      return undefined;
    }
  };

  const write = (state: WindowState): boolean => {
    const tempPath = `${filePath}.${tempSuffix}.tmp`;
    const contents = JSON.stringify({
      ...state.bounds,
      isMaximized: state.isMaximized,
      version: WINDOW_STATE_VERSION,
    });

    try {
      fs.mkdir(dirname(filePath));
      fs.writeFile(tempPath, contents);
      fs.rename(tempPath, filePath);

      return true;
    } catch {
      return false;
    }
  };

  return { read, write };
};
