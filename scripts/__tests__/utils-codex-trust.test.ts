import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  codexConfigPath,
  codexTrustState,
  describeCodexTrustResult,
  ensureCodexProjectTrust,
} from '../utils/codex-trust.ts';

const PROJECT = '/Users/someone/Development/monorepo';

const makeCodexHome = (config: string | undefined): string => {
  const home = mkdtempSync(join(tmpdir(), 'ot-codex-trust-'));

  if (config !== undefined) {
    writeFileSync(join(home, 'config.toml'), config);
  }

  return home;
};

const installed = (): boolean => {
  return true;
};

describe('codexConfigPath', () => {
  it('uses CODEX_HOME when set', () => {
    expect(codexConfigPath({ CODEX_HOME: '/x/codex' })).toBe(
      '/x/codex/config.toml',
    );
  });

  it('defaults to ~/.codex', () => {
    expect(codexConfigPath({})).toMatch(/\.codex\/config\.toml$/);
  });
});

describe('codexTrustState', () => {
  it('is absent when no table names the path', () => {
    expect(
      codexTrustState(
        '[projects."/elsewhere"]\ntrust_level = "trusted"\n',
        PROJECT,
      ),
    ).toBe('absent');
  });

  it('does not treat an ancestor entry as covering the path', () => {
    expect(
      codexTrustState(
        '[projects."/Users/someone/Development"]\ntrust_level = "trusted"\n',
        PROJECT,
      ),
    ).toBe('absent');
  });

  it('reads trusted from the exact table', () => {
    expect(
      codexTrustState(
        `model = "x"\n\n[projects."${PROJECT}"]\ntrust_level = "trusted"\n`,
        PROJECT,
      ),
    ).toBe('trusted');
  });

  it('reports a non-trusted value as other', () => {
    expect(
      codexTrustState(
        `[projects."${PROJECT}"]\ntrust_level = "untrusted"\n`,
        PROJECT,
      ),
    ).toBe('other');
  });

  it('stops reading at the next table', () => {
    const content = `[projects."${PROJECT}"]\n\n[projects."/b"]\ntrust_level = "trusted"\n`;

    expect(codexTrustState(content, PROJECT)).toBe('other');
  });
});

describe('ensureCodexProjectTrust', () => {
  describe('when opted out', () => {
    it('skips without touching the config', () => {
      const home = makeCodexHome('');
      const result = ensureCodexProjectTrust({
        env: { CODEX_HOME: home, OPENTHROTTLE_CODEX_TRUST: '0' },
        isCodexInstalled: installed,
        projectPath: PROJECT,
      });

      expect(result.kind).toBe('skipped');
      expect(readFileSync(join(home, 'config.toml'), 'utf8')).toBe('');
    });
  });

  describe('when codex is not installed', () => {
    it('skips', () => {
      const home = makeCodexHome(undefined);
      const result = ensureCodexProjectTrust({
        env: { CODEX_HOME: home },
        isCodexInstalled: () => false,
        projectPath: PROJECT,
      });

      expect(result.kind).toBe('skipped');
    });
  });

  describe('when the entry is absent', () => {
    it('appends one entry, preserving existing content, and is idempotent', () => {
      const home = makeCodexHome('model = "gpt"');
      const options = {
        env: { CODEX_HOME: home },
        isCodexInstalled: installed,
        projectPath: PROJECT,
      };

      expect(ensureCodexProjectTrust(options).kind).toBe('added');
      expect(ensureCodexProjectTrust(options).kind).toBe('present');

      const content = readFileSync(join(home, 'config.toml'), 'utf8');

      expect(content.startsWith('model = "gpt"\n')).toBe(true);
      expect(content.match(/\[projects\./g)).toHaveLength(1);
      expect(codexTrustState(content, PROJECT)).toBe('trusted');
    });

    it('creates the config when codex has none yet', () => {
      const home = makeCodexHome(undefined);
      const result = ensureCodexProjectTrust({
        env: { CODEX_HOME: home },
        isCodexInstalled: installed,
        projectPath: PROJECT,
      });

      expect(result.kind).toBe('added');
      expect(
        codexTrustState(
          readFileSync(join(home, 'config.toml'), 'utf8'),
          PROJECT,
        ),
      ).toBe('trusted');
    });
  });

  describe('when the user set a non-trusted level', () => {
    it('leaves it alone', () => {
      const original = `[projects."${PROJECT}"]\ntrust_level = "untrusted"\n`;
      const home = makeCodexHome(original);
      const result = ensureCodexProjectTrust({
        env: { CODEX_HOME: home },
        isCodexInstalled: installed,
        projectPath: PROJECT,
      });

      expect(result.kind).toBe('declined');
      expect(readFileSync(join(home, 'config.toml'), 'utf8')).toBe(original);
    });
  });
});

describe('describeCodexTrustResult', () => {
  it('stays quiet for present and skipped', () => {
    expect(
      describeCodexTrustResult({ configPath: '/c', kind: 'present' }, PROJECT),
    ).toBeUndefined();
    expect(
      describeCodexTrustResult({ kind: 'skipped', reason: 'r' }, PROJECT),
    ).toBeUndefined();
  });

  it('warns on declined and failed, informs on added', () => {
    expect(
      describeCodexTrustResult({ configPath: '/c', kind: 'added' }, PROJECT)
        ?.level,
    ).toBe('info');
    expect(
      describeCodexTrustResult({ configPath: '/c', kind: 'declined' }, PROJECT)
        ?.level,
    ).toBe('warn');
    expect(
      describeCodexTrustResult({ kind: 'failed', message: 'm' }, PROJECT)
        ?.level,
    ).toBe('warn');
  });
});
