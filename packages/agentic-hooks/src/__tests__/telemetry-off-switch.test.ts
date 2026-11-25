import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const ADAPTERS_DIR = path.resolve(import.meta.dirname, '..', 'adapters');

const readFixture = (relPath: string): string => {
  return fs.readFileSync(path.join(ADAPTERS_DIR, relPath), 'utf8');
};

interface Entrypoint {
  readonly payload: string;
  readonly script: string;
}

const ENTRYPOINTS: readonly Entrypoint[] = [
  {
    payload: readFixture('claude/__tests__/fixtures/stop-payload.json'),
    script: 'claude/capture.ts',
  },
  {
    payload: readFixture('claude/__tests__/fixtures/stop-payload.json'),
    script: 'claude/complete.ts',
  },
  { payload: '{}', script: 'claude/drain.ts' },
  { payload: '{}', script: 'claude/heartbeat.ts' },
  { payload: '{}', script: 'claude/outcome.ts' },
  {
    payload: readFixture(
      'cursor/__tests__/fixtures/pre-tool-use-skill-read.json',
    ),
    script: 'cursor/capture.ts',
  },
  {
    payload: readFixture('cursor/__tests__/fixtures/session-end.json'),
    script: 'cursor/complete.ts',
  },
  {
    payload: readFixture('cursor/__tests__/fixtures/session-start.json'),
    script: 'cursor/heartbeat.ts',
  },
  {
    payload: readFixture('codex/__tests__/fixtures/pre-tool-use.json'),
    script: 'codex/capture.ts',
  },
  {
    payload: readFixture('codex/__tests__/fixtures/session-end.json'),
    script: 'codex/complete.ts',
  },
  {
    payload: readFixture('codex/__tests__/fixtures/session-start.json'),
    script: 'codex/heartbeat.ts',
  },
  { payload: '{}', script: 'antigravity/heartbeat.ts' },
];

const listFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .flatMap((entry) => {
      return entry.isFile() ? [path.join(entry.parentPath, entry.name)] : [];
    });
};

describe('telemetry off switch (contract §7 layer 2)', () => {
  let home: string;
  let telemetryDir: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-off-switch-'));
    telemetryDir = path.join(home, '.openthrottle', 'skill-usage');
  });

  afterEach(() => {
    fs.rmSync(home, { force: true, recursive: true });
  });

  const run = (entrypoint: Entrypoint, env: Record<string, string>): void => {
    const result = spawnSync(
      process.execPath,
      [path.join(ADAPTERS_DIR, entrypoint.script)],
      {
        cwd: home,
        encoding: 'utf8',
        env: {
          HOME: home,
          OPENTHROTTLE_TELEMETRY_OFFLINE: '1',
          PATH: process.env.PATH ?? '',
          ...env,
        },
        input: entrypoint.payload,
        timeout: 20_000,
      },
    );
    expect(result.status).toBe(0);
  };

  describe('when OPENTHROTTLE_SKILL_USAGE_DISABLED is set in the environment', () => {
    it.each(ENTRYPOINTS)(
      '$script writes no buffer line and no start file',
      (entrypoint) => {
        run(entrypoint, { OPENTHROTTLE_SKILL_USAGE_DISABLED: '1' });
        expect(listFiles(telemetryDir)).toEqual([]);
      },
    );
  });

  describe('when it is set only in ~/.openthrottle/.env', () => {
    it.each(ENTRYPOINTS)('$script writes nothing', (entrypoint) => {
      fs.mkdirSync(path.join(home, '.openthrottle'), { recursive: true });
      fs.writeFileSync(
        path.join(home, '.openthrottle', '.env'),
        'OPENTHROTTLE_SKILL_USAGE_DISABLED=true\n',
      );
      run(entrypoint, {});
      expect(listFiles(telemetryDir)).toEqual([]);
    });
  });

  describe('when it is not set (control)', () => {
    it.each(['cursor/capture.ts', 'codex/capture.ts'])(
      '%s buffers an event and a start file',
      (script) => {
        const entrypoint = ENTRYPOINTS.find((e) => e.script === script);
        if (!entrypoint) {
          throw new Error(`no entrypoint ${script}`);
        }
        run(entrypoint, {});
        expect(listFiles(telemetryDir).length).toBeGreaterThan(0);
      },
    );
  });
});
