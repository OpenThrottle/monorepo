import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  PostgresProfilingEnabledSettings,
  PostgresProfilingSettings,
} from '../postgres-profiling.types.ts';
import {
  isProfilingTarget,
  readPostgresProfilingSettings,
} from './settings.utils.ts';

type EnvKey =
  | 'analyze'
  | 'dedupeSeconds'
  | 'minDurationMs'
  | 'mode'
  | 'outputDir'
  | 'profiling'
  | 'targets';
type EnvValues = Partial<Record<EnvKey, string>>;

const ENV_NAMES: Record<EnvKey, string> = {
  analyze: 'POSTGRES_PROFILING_ANALYZE',
  dedupeSeconds: 'POSTGRES_PROFILING_DEDUPE_SECONDS',
  minDurationMs: 'POSTGRES_PROFILING_MIN_DURATION_MS',
  mode: 'POSTGRES_PROFILING_MODE',
  outputDir: 'POSTGRES_PROFILING_OUTPUT_DIR',
  profiling: 'POSTGRES_PROFILING',
  targets: 'POSTGRES_PROFILING_TARGETS',
};

const envKeys: readonly EnvKey[] = [
  'analyze',
  'dedupeSeconds',
  'minDurationMs',
  'mode',
  'outputDir',
  'profiling',
  'targets',
];

const setEnv = (values: EnvValues = {}): void => {
  for (const key of envKeys) {
    vi.stubEnv(ENV_NAMES[key], values[key]);
  }
};

const targetSources = (settings: PostgresProfilingSettings): string[] => {
  return settings.enabled ? settings.targets.map(({ source }) => source) : [];
};

const enabledSettings = (): PostgresProfilingEnabledSettings => {
  const settings = readPostgresProfilingSettings();

  if (!settings.enabled) {
    throw new Error('expected profiling settings to be enabled');
  }

  return settings;
};

const invalidEntries = (settings: PostgresProfilingSettings): string[] => {
  return settings.enabled ? [...settings.invalidTargets] : [];
};

describe('readPostgresProfilingSettings', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('POSTGRES_PROFILING gate', () => {
    it.each(['true', ' TRUE ', 'True'])('is enabled for %j', (value) => {
      setEnv({ profiling: value });

      expect(readPostgresProfilingSettings().enabled).toBe(true);
    });

    it.each([undefined, '', '1', 'yes', 'false', 'truthy'])(
      'is disabled for %j',
      (value) => {
        setEnv({ profiling: value, targets: 'A.b' });

        expect(readPostgresProfilingSettings()).toEqual({ enabled: false });
      },
    );
  });

  describe('POSTGRES_PROFILING_TARGETS', () => {
    it.each([undefined, '', '  ', ' , ,'])('means all when %j', (targets) => {
      setEnv({ profiling: 'true', targets });
      const settings = readPostgresProfilingSettings();

      expect(targetSources(settings)).toEqual(['*']);
      expect(invalidEntries(settings)).toEqual([]);
    });

    it('parses a bare * as all', () => {
      setEnv({ profiling: 'true', targets: '*' });

      expect(readPostgresProfilingSettings()).toEqual({
        analyze: false,
        dedupeWindowSeconds: 300,
        enabled: true,
        invalidTargets: [],
        minDurationMs: 0,
        output: { mode: 'logger' },
        targets: [{ className: '*', methodName: '*', source: '*' }],
      });
    });

    it('parses Class.*, *.method and Class.method', () => {
      setEnv({ profiling: 'true', targets: 'A.*,*.m,A.m' });

      expect(readPostgresProfilingSettings()).toEqual({
        analyze: false,
        dedupeWindowSeconds: 300,
        enabled: true,
        invalidTargets: [],
        minDurationMs: 0,
        output: { mode: 'logger' },
        targets: [
          { className: 'A', methodName: '*', source: 'A.*' },
          { className: '*', methodName: 'm', source: '*.m' },
          { className: 'A', methodName: 'm', source: 'A.m' },
        ],
      });
    });

    it('trims entries and drops empty ones', () => {
      setEnv({ profiling: 'true', targets: '  A.m ,, B.* ,  ' });

      const settings = readPostgresProfilingSettings();

      expect(targetSources(settings)).toEqual(['A.m', 'B.*']);
      expect(invalidEntries(settings)).toEqual([]);
    });

    it.each(['A', 'A.b.c', 'A.', '.b', '.'])(
      'ignores the invalid entry %j and reports it',
      (entry) => {
        setEnv({ profiling: 'true', targets: `${entry}, B.m` });

        const settings = readPostgresProfilingSettings();

        expect(targetSources(settings)).toEqual(['B.m']);
        expect(invalidEntries(settings)).toEqual([entry]);
      },
    );

    it('matches nothing when every entry is invalid', () => {
      setEnv({ profiling: 'true', targets: 'A' });
      const settings = readPostgresProfilingSettings();

      expect(isProfilingTarget(settings, 'A', 'm')).toBe(false);
    });
  });

  describe('POSTGRES_PROFILING_ANALYZE', () => {
    it.each([undefined, '', 'false', '1', 'yes', 'truthy'])(
      'is off for %j',
      (analyze) => {
        setEnv({ analyze, profiling: 'true' });

        expect(enabledSettings().analyze).toBe(false);
      },
    );

    it.each(['true', ' TRUE ', 'True'])('is on for %j', (analyze) => {
      setEnv({ analyze, profiling: 'true' });

      expect(enabledSettings().analyze).toBe(true);
    });

    it('is ignored while profiling is off', () => {
      setEnv({ analyze: 'true' });

      expect(readPostgresProfilingSettings()).toEqual({ enabled: false });
    });
  });

  describe('POSTGRES_PROFILING_DEDUPE_SECONDS', () => {
    it.each([undefined, '', '  '])(
      'is 300 without a warning for %j',
      (value) => {
        setEnv({ dedupeSeconds: value, profiling: 'true' });
        const settings = enabledSettings();

        expect(settings.dedupeWindowSeconds).toBe(300);
        expect(settings.invalidDedupeSeconds).toBeUndefined();
      },
    );

    it.each([
      ['0', 0],
      [' 60 ', 60],
      ['300', 300],
      ['007', 7],
    ])('parses %j as %j seconds', (value, want) => {
      setEnv({ dedupeSeconds: value, profiling: 'true' });
      const settings = enabledSettings();

      expect(settings.dedupeWindowSeconds).toBe(want);
      expect(settings.invalidDedupeSeconds).toBeUndefined();
    });

    it.each([' -5 ', '1.5', 'abc', '1e3', '9999999999999999999999'])(
      'falls back to 300 and reports %j',
      (value) => {
        setEnv({ dedupeSeconds: value, profiling: 'true' });
        const settings = enabledSettings();

        expect(settings.dedupeWindowSeconds).toBe(300);
        expect(settings.invalidDedupeSeconds).toBe(value.trim());
      },
    );

    it('is ignored while profiling is off', () => {
      setEnv({ dedupeSeconds: '60' });

      expect(readPostgresProfilingSettings()).toEqual({ enabled: false });
    });
  });

  describe('POSTGRES_PROFILING_MIN_DURATION_MS', () => {
    it.each([undefined, '', '  '])('is 0 without a warning for %j', (value) => {
      setEnv({ minDurationMs: value, profiling: 'true' });
      const settings = enabledSettings();

      expect(settings.minDurationMs).toBe(0);
      expect(settings.invalidMinDurationMs).toBeUndefined();
    });

    it.each([
      ['0', 0],
      [' 200 ', 200],
      ['1500', 1500],
      ['007', 7],
    ])('parses %j as %j milliseconds', (value, want) => {
      setEnv({ minDurationMs: value, profiling: 'true' });
      const settings = enabledSettings();

      expect(settings.minDurationMs).toBe(want);
      expect(settings.invalidMinDurationMs).toBeUndefined();
    });

    it.each([' -5 ', '1.5', 'abc', '1e3', '9999999999999999999999'])(
      'falls back to 0 and reports %j',
      (value) => {
        setEnv({ minDurationMs: value, profiling: 'true' });
        const settings = enabledSettings();

        expect(settings.minDurationMs).toBe(0);
        expect(settings.invalidMinDurationMs).toBe(value.trim());
      },
    );

    it('is ignored while profiling is off', () => {
      setEnv({ minDurationMs: '200' });

      expect(readPostgresProfilingSettings()).toEqual({ enabled: false });
    });
  });

  describe('POSTGRES_PROFILING_MODE', () => {
    it.each([undefined, '', '  ', 'logger', ' LOGGER '])(
      'is logger without a warning for %j',
      (mode) => {
        setEnv({ mode, profiling: 'true' });
        const settings = enabledSettings();

        expect(settings.output).toEqual({ mode: 'logger' });
        expect(settings.invalidMode).toBeUndefined();
      },
    );

    it.each(['file', ' FILE '])('is file for %j', (mode) => {
      setEnv({ mode, profiling: 'true' });
      const settings = enabledSettings();

      expect(settings.output.mode).toBe('file');
      expect(settings.invalidMode).toBeUndefined();
    });

    it.each([' files ', 'console'])(
      'falls back to logger and reports %j',
      (mode) => {
        setEnv({ mode, outputDir: '/tmp/plans', profiling: 'true' });
        const settings = enabledSettings();

        expect(settings.output).toEqual({ mode: 'logger' });
        expect(settings.invalidMode).toBe(mode.trim());
      },
    );
  });

  describe('POSTGRES_PROFILING_OUTPUT_DIR', () => {
    it('defaults to .postgres-profiling under the cwd in file mode', () => {
      setEnv({ mode: 'file', profiling: 'true' });

      expect(enabledSettings().output).toEqual({
        mode: 'file',
        outputDir: join(process.cwd(), '.postgres-profiling'),
      });
    });

    it('defaults when blank', () => {
      setEnv({ mode: 'file', outputDir: '  ', profiling: 'true' });

      expect(enabledSettings().output).toEqual({
        mode: 'file',
        outputDir: join(process.cwd(), '.postgres-profiling'),
      });
    });

    it('uses the trimmed value in file mode', () => {
      setEnv({ mode: 'file', outputDir: ' /tmp/plans ', profiling: 'true' });

      expect(enabledSettings().output).toEqual({
        mode: 'file',
        outputDir: '/tmp/plans',
      });
    });

    it('is ignored in logger mode', () => {
      setEnv({ outputDir: '/tmp/plans', profiling: 'true' });

      expect(enabledSettings().output).toEqual({ mode: 'logger' });
    });
  });

  describe('caching', () => {
    it('returns the same object while the raw strings are unchanged', () => {
      setEnv({ profiling: 'true', targets: 'A.m' });

      expect(readPostgresProfilingSettings()).toBe(
        readPostgresProfilingSettings(),
      );
    });

    it('returns the same object while disabled and unchanged', () => {
      setEnv();

      expect(readPostgresProfilingSettings()).toBe(
        readPostgresProfilingSettings(),
      );
    });

    it('re-parses when the targets string changes', () => {
      setEnv({ profiling: 'true', targets: 'A.m' });
      const first = readPostgresProfilingSettings();

      setEnv({ profiling: 'true', targets: 'B.m' });
      const second = readPostgresProfilingSettings();

      expect(second).not.toBe(first);
      expect(targetSources(second)).toEqual(['B.m']);
    });

    it('re-parses when the gate string changes', () => {
      setEnv({ profiling: 'true', targets: 'A.m' });
      const first = readPostgresProfilingSettings();

      setEnv({ profiling: 'false', targets: 'A.m' });
      const second = readPostgresProfilingSettings();

      expect(second).not.toBe(first);
      expect(second.enabled).toBe(false);
    });

    it.each([
      ['analyze', { analyze: 'true' }],
      ['dedupe seconds', { dedupeSeconds: '60' }],
      ['min duration', { minDurationMs: '200' }],
      ['mode', { mode: 'file' }],
      ['output dir', { mode: 'file', outputDir: '/tmp/plans' }],
    ] as const)('re-parses when the %s string changes', (_name, change) => {
      setEnv({ profiling: 'true' });
      const first = readPostgresProfilingSettings();

      setEnv({ profiling: 'true', ...change });
      const second = readPostgresProfilingSettings();

      expect(second).not.toBe(first);
    });

    it('does not read process.cwd() while the raw strings are unchanged', () => {
      setEnv({ mode: 'file', profiling: 'true' });
      readPostgresProfilingSettings();
      const cwdSpy = vi.spyOn(process, 'cwd');

      readPostgresProfilingSettings();
      readPostgresProfilingSettings();

      expect(cwdSpy).not.toHaveBeenCalled();
      cwdSpy.mockRestore();
    });
  });
});

describe('isProfilingTarget', () => {
  const parse = (targets?: string): PostgresProfilingSettings => {
    setEnv({ profiling: 'true', targets });

    return readPostgresProfilingSettings();
  };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['*', 'OrganizationsRepository', 'findBy', true],
    [undefined, 'OrganizationsRepository', 'findBy', true],
    ['OrganizationsRepository.*', 'OrganizationsRepository', 'findBy', true],
    ['OrganizationsRepository.*', 'UsersRepository', 'findBy', false],
    ['*.findBy', 'UsersRepository', 'findBy', true],
    ['*.findBy', 'UsersRepository', 'save', false],
    ['UsersRepository.findBy', 'UsersRepository', 'findBy', true],
    ['UsersRepository.findBy', 'UsersRepository', 'save', false],
    ['UsersRepository.findBy', 'OrganizationsRepository', 'findBy', false],
    ['usersrepository.findBy', 'UsersRepository', 'findBy', false],
    ['UsersRepository.findby', 'UsersRepository', 'findBy', false],
    ['A.*, *.findBy', 'UsersRepository', 'findBy', true],
    ['A.*, *.findBy', 'UsersRepository', 'save', false],
  ] as const)('targets %j: %s.%s -> %s', (targets, className, method, want) => {
    expect(isProfilingTarget(parse(targets), className, method)).toBe(want);
  });

  it('never matches when the gate is off', () => {
    expect(isProfilingTarget({ enabled: false }, 'A', 'm')).toBe(false);
  });
});
