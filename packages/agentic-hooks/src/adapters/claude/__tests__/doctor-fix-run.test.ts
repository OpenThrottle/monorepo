import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PluginFixPlan } from '../doctor-fix.ts';
import {
  PLUGIN_FIX_OUTCOME,
  type PluginFixIo,
  resolveClaudeBinary,
  resolvePluginFixPlan,
  runPluginFix,
  spawnInherited,
} from '../doctor-fix-run.ts';

const INSTALL_PLAN: PluginFixPlan = {
  commands: [
    ['plugin', 'marketplace', 'add', 'OpenThrottle/monorepo'],
    ['plugin', 'install', 'openthrottle@openthrottle'],
  ],
  kind: 'install',
};

/** A `claude` stub that appends its argv to `calls.log`, failing on `failOn` as its first arg after `plugin`. */
const writeStub = (dir: string, failOn: string | null): string => {
  const file = path.join(dir, 'claude');
  const log = path.join(dir, 'calls.log');
  const fail = failOn === null ? '' : `[ "$2" = "${failOn}" ] && exit 3\n`;
  fs.writeFileSync(file, `#!/bin/sh\necho "$*" >> "${log}"\n${fail}exit 0\n`, {
    mode: 0o755,
  });
  return file;
};

const readCalls = (dir: string): readonly string[] => {
  const log = path.join(dir, 'calls.log');
  if (!fs.existsSync(log)) {
    return [];
  }
  return fs.readFileSync(log, 'utf8').trim().split('\n');
};

interface RecordingIo extends PluginFixIo {
  readonly output: () => string;
}

const makeIo = ({
  answer,
  isInteractive,
}: {
  readonly answer: string;
  readonly isInteractive: boolean;
}): RecordingIo => {
  const chunks: string[] = [];
  return {
    ask: (question) => {
      chunks.push(question);
      return Promise.resolve(answer);
    },
    isInteractive,
    output: () => {
      return chunks.join('');
    },
    run: spawnInherited,
    write: (text) => {
      chunks.push(text);
    },
  };
};

describe('runPluginFix with a stub claude binary', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-fix-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { force: true, recursive: true });
  });

  describe('when there is nothing to fix', () => {
    it('runs nothing and asks nothing', async () => {
      const binary = writeStub(dir, null);
      const io = makeIo({ answer: 'y', isInteractive: true });

      await expect(
        runPluginFix({ binary, io, plan: { kind: 'none' } }),
      ).resolves.toBe(PLUGIN_FIX_OUTCOME.NOTHING_TO_FIX);
      expect(readCalls(dir)).toEqual([]);
      expect(io.output()).not.toContain('[y/N]');
    });
  });

  describe('when there is no TTY', () => {
    it('shows the commands but refuses to run them', async () => {
      const binary = writeStub(dir, null);
      const io = makeIo({ answer: 'y', isInteractive: false });

      await expect(
        runPluginFix({ binary, io, plan: INSTALL_PLAN }),
      ).resolves.toBe(PLUGIN_FIX_OUTCOME.NO_TTY);
      expect(readCalls(dir)).toEqual([]);
      expect(io.output()).toContain('plugin install openthrottle@openthrottle');
      expect(io.output()).not.toContain('[y/N]');
    });
  });

  describe('when the user declines', () => {
    it.each(['', 'n', 'no', 'maybe'])('runs nothing for %j', async (answer) => {
      const binary = writeStub(dir, null);
      const io = makeIo({ answer, isInteractive: true });

      await expect(
        runPluginFix({ binary, io, plan: INSTALL_PLAN }),
      ).resolves.toBe(PLUGIN_FIX_OUTCOME.DECLINED);
      expect(readCalls(dir)).toEqual([]);
    });
  });

  describe('when the user consents', () => {
    it('runs every command in order', async () => {
      const binary = writeStub(dir, null);
      const io = makeIo({ answer: 'Y', isInteractive: true });

      await expect(
        runPluginFix({ binary, io, plan: INSTALL_PLAN }),
      ).resolves.toBe(PLUGIN_FIX_OUTCOME.APPLIED);
      expect(readCalls(dir)).toEqual([
        'plugin marketplace add OpenThrottle/monorepo',
        'plugin install openthrottle@openthrottle',
      ]);
      expect(io.output()).toContain('Restart Claude Code');
    });

    it('stops at the first failing command', async () => {
      const binary = writeStub(dir, 'marketplace');
      const io = makeIo({ answer: 'yes', isInteractive: true });

      await expect(
        runPluginFix({ binary, io, plan: INSTALL_PLAN }),
      ).resolves.toBe(PLUGIN_FIX_OUTCOME.FAILED);
      expect(readCalls(dir)).toEqual([
        'plugin marketplace add OpenThrottle/monorepo',
      ]);
      expect(io.output()).toContain('exited 3');
    });
  });
});

describe('resolvePluginFixPlan against a fixture config dir', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-fix-plan-'));
    fs.mkdirSync(path.join(dir, 'plugins'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(dir, { force: true, recursive: true });
  });

  it('skips the marketplace add when known_marketplaces.json lists it', () => {
    fs.writeFileSync(
      path.join(dir, 'plugins', 'installed_plugins.json'),
      JSON.stringify({ plugins: {}, version: 2 }),
    );
    fs.writeFileSync(
      path.join(dir, 'plugins', 'known_marketplaces.json'),
      JSON.stringify({ openthrottle: { source: {} } }),
    );

    expect(
      resolvePluginFixPlan({
        env: { CLAUDE_CONFIG_DIR: dir },
        homeDir: dir,
        scriptPath: path.join(dir, 'missing', 'doctor.cjs'),
      }),
    ).toEqual({
      commands: [['plugin', 'install', 'openthrottle@openthrottle']],
      kind: 'install',
    });
  });
});

describe('resolveClaudeBinary', () => {
  it('prefers OPENTHROTTLE_CLAUDE_BIN, else claude on PATH', () => {
    expect(
      resolveClaudeBinary({ OPENTHROTTLE_CLAUDE_BIN: ' /x/claude ' }),
    ).toBe('/x/claude');
    expect(resolveClaudeBinary({ OPENTHROTTLE_CLAUDE_BIN: '  ' })).toBe(
      'claude',
    );
    expect(resolveClaudeBinary({})).toBe('claude');
  });
});
