import 'reflect-metadata';

import { SetMetadata } from '@nestjs/common';
import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetPostgresProfilingDedupe } from './explain-dedupe/explain-dedupe.utils.ts';
import {
  ORGANIZATIONS_EXPLAIN_RESULT,
  USERS_INDEX_SCAN_EXPLAIN_RESULT,
} from './explain-plan/explain-outputs.factory.ts';
import { flushPostgresProfiling } from './explain-tracking/explain-tracking.utils.ts';
import { POSTGRES_PROFILING_LOGGER } from './postgres-profiling.constants.ts';
import { PostgresProfiling } from './postgres-profiling.decorator.ts';
import { captureQuery } from './query-capture/query-capture.utils.ts';
import {
  logPostgresProfilingStartupOnce,
  resetPostgresProfilingStartupLog,
} from './startup-log/startup-log.utils.ts';

const META = { context: 'PostgresProfiling' };
const METADATA_KEY = 'postgres-profiling-test';
const SELECT_USERS = 'SELECT * FROM users WHERE id = $1';

const managerQuery =
  vi.fn<(query: string, parameters?: unknown[]) => unknown>();

let clockMs = 0;
let originalCallCount = 0;

const buildRepository = (): {
  readonly manager: { query: typeof managerQuery };
} => {
  return { manager: { query: managerQuery } };
};

class UserRepository {
  readonly repository = buildRepository();

  @PostgresProfiling()
  async failing(error: Error): Promise<string> {
    captureQuery({ query: 'DELETE FROM users' });

    throw error;
  }

  @SetMetadata(METADATA_KEY, 'above')
  @PostgresProfiling()
  async metadataAbove(): Promise<void> {}

  @PostgresProfiling()
  @SetMetadata(METADATA_KEY, 'below')
  async metadataBelow(): Promise<void> {}

  @PostgresProfiling()
  async select(query: string): Promise<string> {
    originalCallCount += 1;
    captureQuery({ parameters: [7], query });

    return 'selected';
  }

  @PostgresProfiling()
  async twoQueries(): Promise<string> {
    captureQuery({ query: 'SELECT 1' });
    captureQuery({ query: 'SELECT 2' });

    return 'two';
  }
}

class AnalyzeRepository {
  readonly repository = buildRepository();

  @PostgresProfiling({ analyze: false })
  async analyzeOff(): Promise<string> {
    captureQuery({ query: 'SELECT 1' });

    return 'off';
  }

  @PostgresProfiling()
  async analyzeUnset(): Promise<string> {
    captureQuery({ query: 'SELECT 1' });

    return 'unset';
  }
}

class TimedRepository {
  readonly repository = buildRepository();

  @PostgresProfiling()
  async run(durationMs: number, query: string): Promise<string> {
    captureQuery({ query });
    clockMs += durationMs;

    return 'timed';
  }

  @PostgresProfiling()
  async runAndFail(durationMs: number, error: Error): Promise<string> {
    captureQuery({ query: 'SELECT 1' });
    clockMs += durationMs;

    throw error;
  }
}

class RepositoryWithoutManager {
  readonly repository = {};

  @PostgresProfiling()
  async find(): Promise<string> {
    captureQuery({ query: 'SELECT 1' });

    return 'no-manager';
  }

  @PostgresProfiling()
  async findOther(): Promise<string> {
    captureQuery({ query: 'SELECT 1' });

    return 'no-manager-other';
  }
}

class NoRepository {
  @PostgresProfiling()
  async find(): Promise<string> {
    captureQuery({ query: 'SELECT 1' });

    return 'no-repository';
  }
}

const ENV_NAMES = [
  'POSTGRES_PROFILING',
  'POSTGRES_PROFILING_ANALYZE',
  'POSTGRES_PROFILING_DEDUPE_SECONDS',
  'POSTGRES_PROFILING_MIN_DURATION_MS',
  'POSTGRES_PROFILING_MODE',
  'POSTGRES_PROFILING_OUTPUT_DIR',
  'POSTGRES_PROFILING_TARGETS',
] as const;

const originalEnv = ENV_NAMES.map((name) => [name, process.env[name]] as const);

const restoreEnv = (): void => {
  for (const [name, value] of originalEnv) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
};

describe('PostgresProfiling', () => {
  let infoSpy: MockInstance;
  let warnSpy: MockInstance;
  let repository: UserRepository;

  beforeEach(() => {
    infoSpy = vi
      .spyOn(POSTGRES_PROFILING_LOGGER, 'info')
      .mockImplementation(() => undefined);
    warnSpy = vi
      .spyOn(POSTGRES_PROFILING_LOGGER, 'warn')
      .mockImplementation(() => undefined);
    vi.spyOn(POSTGRES_PROFILING_LOGGER, 'debug').mockImplementation(
      () => undefined,
    );
    managerQuery.mockReset().mockResolvedValue(USERS_INDEX_SCAN_EXPLAIN_RESULT);
    originalCallCount = 0;
    clockMs = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => clockMs);
    repository = new UserRepository();

    for (const name of ENV_NAMES) {
      delete process.env[name];
    }

    process.env.POSTGRES_PROFILING = 'true';
    resetPostgresProfilingDedupe();
    resetPostgresProfilingStartupLog();
    // Mark the one-time startup line as logged so per-test log counts stay exact.
    logPostgresProfilingStartupOnce(POSTGRES_PROFILING_LOGGER, {
      analyze: false,
      dedupeWindowSeconds: 300,
      enabled: true,
      invalidTargets: [],
      minDurationMs: 0,
      output: { mode: 'logger' },
      targets: [],
    });
    infoSpy.mockClear();
  });

  afterEach(async () => {
    await flushPostgresProfiling();
    restoreEnv();
    resetPostgresProfilingDedupe();
    resetPostgresProfilingStartupLog();
    vi.restoreAllMocks();
  });

  describe('when POSTGRES_PROFILING is not true', () => {
    it.each([undefined, '', 'false', '1', 'yes'])(
      'calls the original once with no explain or log for %j',
      async (value) => {
        if (value === undefined) {
          delete process.env.POSTGRES_PROFILING;
        } else {
          process.env.POSTGRES_PROFILING = value;
        }

        resetPostgresProfilingStartupLog();

        await expect(repository.select(SELECT_USERS)).resolves.toBe('selected');
        await flushPostgresProfiling();

        expect(originalCallCount).toBe(1);
        expect(managerQuery).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
      },
    );

    it('reads the gate on every call', async () => {
      process.env.POSTGRES_PROFILING = 'false';
      await repository.select(SELECT_USERS);
      await flushPostgresProfiling();
      expect(managerQuery).not.toHaveBeenCalled();

      process.env.POSTGRES_PROFILING = ' TRUE ';
      await repository.select(SELECT_USERS);
      await flushPostgresProfiling();
      expect(managerQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('when POSTGRES_PROFILING_TARGETS does not match', () => {
    it.each([
      'OtherRepository.select',
      'UserRepository.otherMethod',
      'userrepository.select',
    ])('skips explain for %j and calls the original once', async (targets) => {
      process.env.POSTGRES_PROFILING_TARGETS = targets;

      await expect(repository.select(SELECT_USERS)).resolves.toBe('selected');
      await flushPostgresProfiling();

      expect(originalCallCount).toBe(1);
      expect(managerQuery).not.toHaveBeenCalled();
    });
  });

  describe('when POSTGRES_PROFILING_TARGETS matches', () => {
    it.each([
      '*',
      'UserRepository.*',
      '*.select',
      'UserRepository.select',
      'Other.method, UserRepository.select',
    ])('explains for %j', async (targets) => {
      process.env.POSTGRES_PROFILING_TARGETS = targets;

      await repository.select(SELECT_USERS);
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(1);
    });

    it('matches the runtime subclass name, not the declaring class', async () => {
      class ChildRepository extends UserRepository {}

      process.env.POSTGRES_PROFILING_TARGETS = 'ChildRepository.select';
      await new ChildRepository().select(SELECT_USERS);
      await flushPostgresProfiling();
      expect(managerQuery).toHaveBeenCalledTimes(1);

      managerQuery.mockClear();
      process.env.POSTGRES_PROFILING_TARGETS = 'UserRepository.select';
      await new ChildRepository().select(SELECT_USERS);
      await flushPostgresProfiling();
      expect(managerQuery).not.toHaveBeenCalled();
    });
  });

  describe('startup log', () => {
    it('logs once across calls and methods, even when the first call is not a target', async () => {
      resetPostgresProfilingStartupLog();
      process.env.POSTGRES_PROFILING_TARGETS = 'OtherRepository.*';

      await repository.select(SELECT_USERS);
      await repository.twoQueries();
      await flushPostgresProfiling();

      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledWith(
        'profiling enabled for OtherRepository.* (analyze off, mode logger, dedupe 300s)',
        META,
      );
    });

    it('logs nothing when profiling is off', async () => {
      resetPostgresProfilingStartupLog();
      process.env.POSTGRES_PROFILING = 'false';

      await repository.select(SELECT_USERS);

      expect(infoSpy).not.toHaveBeenCalled();
    });
  });

  describe('when the method runs', () => {
    it('returns the original value and passes arguments through', async () => {
      await expect(repository.select(SELECT_USERS)).resolves.toBe('selected');
      expect(originalCallCount).toBe(1);
    });

    it('rethrows the original error and still explains captured statements', async () => {
      const error = new Error('boom');

      await expect(repository.failing(error)).rejects.toBe(error);
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(1);
      expect(managerQuery.mock.calls[0]?.[0]).toBe(
        'EXPLAIN (FORMAT JSON, SUMMARY) DELETE FROM users',
      );
    });

    it('keeps the original error when the explain also fails', async () => {
      const error = new Error('method failed');

      managerQuery.mockRejectedValue(new Error('explain failed'));

      await expect(repository.failing(error)).rejects.toBe(error);
      await flushPostgresProfiling();
    });

    it('explains each explainable statement with its parameters and skips transaction control', async () => {
      class MixedRepository {
        readonly repository = buildRepository();

        @PostgresProfiling()
        async run(): Promise<string> {
          captureQuery({ parameters: [1], query: SELECT_USERS });
          captureQuery({ query: 'START TRANSACTION' });
          captureQuery({ query: '  (select 2)' });
          captureQuery({ query: 'COMMIT' });

          return 'mixed';
        }
      }

      await new MixedRepository().run();
      await flushPostgresProfiling();

      expect(managerQuery.mock.calls).toEqual([
        [`EXPLAIN (FORMAT JSON, SUMMARY) ${SELECT_USERS}`, [1]],
        ['EXPLAIN (FORMAT JSON, SUMMARY)   (select 2)', undefined],
      ]);
    });

    it('logs the plan summary with the class and method name', async () => {
      managerQuery.mockResolvedValue(ORGANIZATIONS_EXPLAIN_RESULT);

      await repository.select(SELECT_USERS);
      await flushPostgresProfiling();

      expect(warnSpy.mock.calls[0]?.[0]).toContain('UserRepository.select');
    });
  });

  describe('wrapper shape', () => {
    it('keeps the original method name', () => {
      expect(UserRepository.prototype.select.name).toBe('select');
    });

    it('keeps metadata set before the decorator ran', () => {
      expect(
        Reflect.getMetadata(
          METADATA_KEY,
          UserRepository.prototype.metadataBelow,
        ),
      ).toBe('below');
    });

    it('accepts metadata set after the decorator ran', () => {
      expect(
        Reflect.getMetadata(
          METADATA_KEY,
          UserRepository.prototype.metadataAbove,
        ),
      ).toBe('above');
    });
  });

  describe('when the instance has no repository.manager', () => {
    it('skips explain and returns the result', async () => {
      await expect(new RepositoryWithoutManager().find()).resolves.toBe(
        'no-manager',
      );
      await flushPostgresProfiling();

      expect(managerQuery).not.toHaveBeenCalled();
    });

    it('warns once per decorated method, not once per call', async () => {
      // The once-flag lives on the decorated method, so use a class no other test touched.
      class FreshRepository {
        readonly repository = {};

        @PostgresProfiling()
        async find(): Promise<string> {
          return 'fresh';
        }

        @PostgresProfiling()
        async findOther(): Promise<string> {
          return 'fresh-other';
        }
      }
      const instance = new FreshRepository();

      await instance.find();
      await instance.find();
      await instance.findOther();
      await instance.findOther();

      const missingManagerWarnings = warnSpy.mock.calls.filter(([message]) =>
        String(message).includes('repository.manager'),
      );

      expect(missingManagerWarnings).toEqual([
        [
          'Skipping explain for find: the instance has no repository.manager.',
          META,
        ],
        [
          'Skipping explain for findOther: the instance has no repository.manager.',
          META,
        ],
      ]);
    });

    it('treats an instance without a repository the same way and never throws', async () => {
      await expect(new NoRepository().find()).resolves.toBe('no-repository');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('when explaining in the background', () => {
    it('returns the result before the explain query resolves', async () => {
      let resolveExplain: (value: unknown) => void = () => {
        return undefined;
      };

      managerQuery.mockReturnValue(
        new Promise<unknown>((resolve) => {
          resolveExplain = resolve;
        }),
      );

      await expect(repository.select(SELECT_USERS)).resolves.toBe('selected');
      expect(managerQuery).toHaveBeenCalledTimes(1);

      resolveExplain(USERS_INDEX_SCAN_EXPLAIN_RESULT);
      await flushPostgresProfiling();
    });

    it('rethrows a method error before the explain query resolves', async () => {
      let resolveExplain: (value: unknown) => void = () => {
        return undefined;
      };

      managerQuery.mockReturnValue(
        new Promise<unknown>((resolve) => {
          resolveExplain = resolve;
        }),
      );
      const error = new Error('boom');

      await expect(repository.failing(error)).rejects.toBe(error);
      resolveExplain(USERS_INDEX_SCAN_EXPLAIN_RESULT);
    });

    it('starts the second explain only after the first resolves', async () => {
      let resolveFirst: (value: unknown) => void = () => {
        return undefined;
      };

      managerQuery.mockReturnValueOnce(
        new Promise<unknown>((resolve) => {
          resolveFirst = resolve;
        }),
      );

      await repository.twoQueries();
      await Promise.resolve();
      expect(managerQuery).toHaveBeenCalledTimes(1);

      resolveFirst(USERS_INDEX_SCAN_EXPLAIN_RESULT);
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(2);
    });

    it('warns and leaves the method result alone when the explain query fails', async () => {
      managerQuery.mockRejectedValue(new Error('explain failed'));

      await expect(repository.select(SELECT_USERS)).resolves.toBe('selected');
      await flushPostgresProfiling();

      expect(warnSpy.mock.calls[0]?.[0]).toContain('explain failed');
    });
  });

  describe('when POSTGRES_PROFILING_ANALYZE is true', () => {
    beforeEach(() => {
      process.env.POSTGRES_PROFILING_ANALYZE = 'true';
    });

    it('explains a plain SELECT with ANALYZE and keeps its parameters', async () => {
      await repository.select(SELECT_USERS);
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledWith(
        `EXPLAIN (ANALYZE, BUFFERS, SUMMARY, FORMAT JSON) ${SELECT_USERS}`,
        [7],
      );
    });

    it('keeps plain EXPLAIN for writes', async () => {
      await repository.failing(new Error('x')).catch(() => undefined);
      await flushPostgresProfiling();

      expect(managerQuery.mock.calls[0]?.[0]).toBe(
        'EXPLAIN (FORMAT JSON, SUMMARY) DELETE FROM users',
      );
    });

    it('keeps plain EXPLAIN when the method passes analyze: false', async () => {
      await new AnalyzeRepository().analyzeOff();
      await flushPostgresProfiling();

      expect(managerQuery.mock.calls[0]?.[0]).toBe(
        'EXPLAIN (FORMAT JSON, SUMMARY) SELECT 1',
      );
    });

    it('analyzes a method that leaves the override unset', async () => {
      await new AnalyzeRepository().analyzeUnset();
      await flushPostgresProfiling();

      expect(managerQuery.mock.calls[0]?.[0]).toBe(
        'EXPLAIN (ANALYZE, BUFFERS, SUMMARY, FORMAT JSON) SELECT 1',
      );
    });
  });

  describe('when POSTGRES_PROFILING_ANALYZE is not true', () => {
    it.each([undefined, '', 'false', '1'])(
      'never uses ANALYZE for %j',
      async (value) => {
        if (value !== undefined) {
          process.env.POSTGRES_PROFILING_ANALYZE = value;
        }

        await repository.select(SELECT_USERS);
        await flushPostgresProfiling();

        expect(managerQuery.mock.calls[0]?.[0]).not.toContain('ANALYZE');
      },
    );
  });

  describe('when the same statement repeats', () => {
    const DEDUPE_WINDOW_MS = 300_000;
    let nowMs: number;

    beforeEach(() => {
      nowMs = 1_000_000;
      vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    });

    it('explains it once inside the window and still returns the result', async () => {
      await repository.select(SELECT_USERS);
      nowMs += DEDUPE_WINDOW_MS - 1;
      await expect(repository.select(SELECT_USERS)).resolves.toBe('selected');
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(1);
    });

    it('explains it again after the window', async () => {
      await repository.select(SELECT_USERS);
      nowMs += DEDUPE_WINDOW_MS;
      await repository.select(SELECT_USERS);
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(2);
    });

    it('uses the window from POSTGRES_PROFILING_DEDUPE_SECONDS', async () => {
      process.env.POSTGRES_PROFILING_DEDUPE_SECONDS = '10';

      await repository.select(SELECT_USERS);
      nowMs += 9_999;
      await repository.select(SELECT_USERS);
      await flushPostgresProfiling();
      expect(managerQuery).toHaveBeenCalledTimes(1);

      nowMs += 1;
      await repository.select(SELECT_USERS);
      await flushPostgresProfiling();
      expect(managerQuery).toHaveBeenCalledTimes(2);
    });

    it('explains every execution when the window is 0', async () => {
      process.env.POSTGRES_PROFILING_DEDUPE_SECONDS = '0';

      await repository.select(SELECT_USERS);
      await repository.select(SELECT_USERS);
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(2);
    });

    it('keys by class and method as well as SQL', async () => {
      class ChildRepository extends UserRepository {}

      await repository.select('SELECT 1');
      await repository.select('SELECT 2');
      await new ChildRepository().select('SELECT 1');
      await repository.failing(new Error('x')).catch(() => undefined);
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(4);
    });

    it('explains concurrent identical calls once, even while the first explain is pending', async () => {
      let resolveExplain: (value: unknown) => void = () => {
        return undefined;
      };

      managerQuery.mockReturnValue(
        new Promise<unknown>((resolve) => {
          resolveExplain = resolve;
        }),
      );

      await Promise.all([
        repository.select(SELECT_USERS),
        repository.select(SELECT_USERS),
        repository.select(SELECT_USERS),
      ]);
      resolveExplain(USERS_INDEX_SCAN_EXPLAIN_RESULT);
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(1);
    });

    it('does not record a statement when the instance has no manager', async () => {
      await new RepositoryWithoutManager().find();
      await repository.twoQueries();
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('when POSTGRES_PROFILING_MIN_DURATION_MS is set', () => {
    let timed: TimedRepository;

    beforeEach(() => {
      process.env.POSTGRES_PROFILING_MIN_DURATION_MS = '50';
      timed = new TimedRepository();
    });

    it('does not explain a call below the threshold but returns its result', async () => {
      await expect(timed.run(49, 'SELECT 1')).resolves.toBe('timed');
      await flushPostgresProfiling();

      expect(managerQuery).not.toHaveBeenCalled();
    });

    it.each([50, 51])('explains a call lasting %ims', async (durationMs) => {
      await timed.run(durationMs, 'SELECT 1');
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(1);
    });

    it('explains a slow call that throws and rethrows its error', async () => {
      const error = new Error('slow failure');

      await expect(timed.runAndFail(60, error)).rejects.toBe(error);
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(1);
    });

    it('does not explain a fast call that throws, and still rethrows', async () => {
      const error = new Error('fast failure');

      await expect(timed.runAndFail(1, error)).rejects.toBe(error);
      await flushPostgresProfiling();

      expect(managerQuery).not.toHaveBeenCalled();
    });

    it('lets a fast call skip without taking the dedupe slot of a later slow one', async () => {
      await timed.run(1, 'SELECT 1');
      await timed.run(80, 'SELECT 1');
      await timed.run(80, 'SELECT 1');
      await flushPostgresProfiling();

      expect(managerQuery).toHaveBeenCalledTimes(1);
    });

    it('measures the whole method and shows it as took= in the summary', async () => {
      await timed.run(120, 'SELECT 1');
      await flushPostgresProfiling();

      expect(infoSpy.mock.calls[0]?.[0]).toContain('took=120ms');
    });
  });
});
