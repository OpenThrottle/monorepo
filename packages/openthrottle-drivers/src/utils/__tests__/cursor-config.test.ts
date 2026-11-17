import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CURSOR_CONFIG_DIR_ENV,
  cursorAttributionOffEnv,
  OPENTHROTTLE_CURSOR_CONFIG_DIR_ENV,
  prepareCursorConfigDir,
} from '../cursor-config.ts';

const ATTRIBUTION_OFF = {
  attributeCommitsToAgent: false,
  attributePRsToAgent: false,
};

let dir: string;
let userDir: string;
let targetDir: string;

const readTarget = (): Record<string, unknown> => {
  return JSON.parse(readFileSync(join(targetDir, 'cli-config.json'), 'utf8'));
};

const envFor = (
  extra: Readonly<Record<string, string>> = {},
): NodeJS.ProcessEnv => {
  return {
    [CURSOR_CONFIG_DIR_ENV]: userDir,
    [OPENTHROTTLE_CURSOR_CONFIG_DIR_ENV]: targetDir,
    ...extra,
  };
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cursor-config-'));
  userDir = join(dir, 'user');
  targetDir = join(dir, 'target');
  mkdirSync(userDir);
});

afterEach(() => {
  rmSync(dir, { force: true, recursive: true });
});

describe('prepareCursorConfigDir', () => {
  describe('when the user has a cli-config.json', () => {
    it('copies it with attribution forced off and leaves the original untouched', () => {
      const original = `${JSON.stringify({
        attribution: {
          attributeCommitsToAgent: true,
          attributePRsToAgent: true,
        },
        model: { modelId: 'composer-2.5' },
        version: 1,
      })}\n`;
      writeFileSync(join(userDir, 'cli-config.json'), original);

      expect(prepareCursorConfigDir(envFor())).toBe(targetDir);
      expect(readTarget()).toEqual({
        attribution: ATTRIBUTION_OFF,
        model: { modelId: 'composer-2.5' },
        version: 1,
      });
      expect(readFileSync(join(userDir, 'cli-config.json'), 'utf8')).toBe(
        original,
      );
    });

    it('re-seeds from the user file on every call', () => {
      writeFileSync(join(userDir, 'cli-config.json'), '{"model":"a"}');
      prepareCursorConfigDir(envFor());
      writeFileSync(join(userDir, 'cli-config.json'), '{"model":"b"}');
      prepareCursorConfigDir(envFor());

      expect(readTarget()).toEqual({
        attribution: ATTRIBUTION_OFF,
        model: 'b',
      });
    });

    it('writes the copy owner-only', () => {
      writeFileSync(join(userDir, 'cli-config.json'), '{}');
      prepareCursorConfigDir(envFor());

      expect(statSync(join(targetDir, 'cli-config.json')).mode & 0o777).toBe(
        0o600,
      );
    });
  });

  describe('when the user file is missing or not a JSON object', () => {
    it('writes a minimal config for a missing file', () => {
      prepareCursorConfigDir(envFor());

      expect(readTarget()).toEqual({
        attribution: ATTRIBUTION_OFF,
        version: 1,
      });
    });

    it('writes a minimal config for an unparsable file', () => {
      writeFileSync(join(userDir, 'cli-config.json'), '[1, 2');
      prepareCursorConfigDir(envFor());

      expect(readTarget()).toEqual({
        attribution: ATTRIBUTION_OFF,
        version: 1,
      });
    });
  });

  describe('when CURSOR_CONFIG_DIR is unset', () => {
    it('seeds from $XDG_CONFIG_HOME/cursor', () => {
      const xdg = join(dir, 'xdg');
      mkdirSync(join(xdg, 'cursor'), { recursive: true });
      writeFileSync(join(xdg, 'cursor', 'cli-config.json'), '{"from":"xdg"}');

      prepareCursorConfigDir({
        [OPENTHROTTLE_CURSOR_CONFIG_DIR_ENV]: targetDir,
        XDG_CONFIG_HOME: xdg,
      });

      expect(readTarget()).toEqual({
        attribution: ATTRIBUTION_OFF,
        from: 'xdg',
      });
    });
  });

  describe('when the env already points at the copy', () => {
    it('re-seeds from the copy itself, as a nested spawn would', () => {
      mkdirSync(targetDir);
      writeFileSync(join(targetDir, 'cli-config.json'), '{"keep":true}');

      prepareCursorConfigDir(envFor({ [CURSOR_CONFIG_DIR_ENV]: targetDir }));

      expect(readTarget()).toEqual({
        attribution: ATTRIBUTION_OFF,
        keep: true,
      });
    });
  });

  describe('when the target cannot be written', () => {
    it('returns undefined', () => {
      const blocker = join(dir, 'blocker');
      writeFileSync(blocker, '');

      expect(
        prepareCursorConfigDir(
          envFor({ [OPENTHROTTLE_CURSOR_CONFIG_DIR_ENV]: join(blocker, 'x') }),
        ),
      ).toBeUndefined();
    });
  });
});

describe('cursorAttributionOffEnv', () => {
  it('names the prepared dir as CURSOR_CONFIG_DIR', () => {
    expect(cursorAttributionOffEnv(envFor())).toEqual({
      [CURSOR_CONFIG_DIR_ENV]: targetDir,
    });
  });

  it('adds nothing when the dir cannot be prepared', () => {
    const blocker = join(dir, 'blocker');
    writeFileSync(blocker, '');

    expect(
      cursorAttributionOffEnv(
        envFor({ [OPENTHROTTLE_CURSOR_CONFIG_DIR_ENV]: join(blocker, 'x') }),
      ),
    ).toEqual({});
  });
});
