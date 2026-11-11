import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ORGANIZATIONS_EXPLAIN_OUTPUT,
  USERS_INDEX_SCAN_EXPLAIN_OUTPUT,
} from '../explain-plan/explain-outputs.factory.ts';
import { summarizeExplainPlan } from '../explain-plan/explain-plan.utils.ts';
import { POSTGRES_PROFILING_LOGGER } from '../postgres-profiling.constants.ts';
import type {
  PostgresExplainPlanEntry,
  PostgresProfilingOutput,
} from '../postgres-profiling.types.ts';
import { writePostgresExplainPlan } from './explain-sink.utils.ts';

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

const mkdirMock = vi.mocked(mkdir);
const writeFileMock = vi.mocked(writeFile);

const writtenFilePath = (callIndex: number): string => {
  return String(writeFileMock.mock.calls[callIndex]?.[0]);
};

const writtenFileContent = (callIndex: number): unknown => {
  return writeFileMock.mock.calls[callIndex]?.[1];
};

const loggerConfig: PostgresProfilingOutput = { mode: 'logger' };
const fileConfig: PostgresProfilingOutput = {
  mode: 'file',
  outputDir: '/tmp/plans',
};

const buildEntry = (
  overrides: Partial<PostgresExplainPlanEntry> = {},
): PostgresExplainPlanEntry => {
  return {
    className: 'UserRepository',
    methodName: 'findActive',
    plan: USERS_INDEX_SCAN_EXPLAIN_OUTPUT,
    query: 'SELECT * FROM users WHERE id = $1',
    ...overrides,
  };
};

describe('writePostgresExplainPlan', () => {
  let debugSpy: MockInstance;
  let infoSpy: MockInstance;
  let warnSpy: MockInstance;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date('2026-01-02T03:04:05.678Z'));
    debugSpy = vi
      .spyOn(POSTGRES_PROFILING_LOGGER, 'debug')
      .mockImplementation(() => undefined);
    infoSpy = vi
      .spyOn(POSTGRES_PROFILING_LOGGER, 'info')
      .mockImplementation(() => undefined);
    warnSpy = vi
      .spyOn(POSTGRES_PROFILING_LOGGER, 'warn')
      .mockImplementation(() => undefined);
    mkdirMock.mockReset().mockResolvedValue(undefined);
    writeFileMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('when mode is logger and the plan is an index scan', () => {
    it('logs one summary line prefixed with class.method', async () => {
      await writePostgresExplainPlan(loggerConfig, buildEntry());

      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledWith(
        'UserRepository.findActive → Index Scan users via PK_users [cond: id = $1] | rows≈1 cost=8.17',
        { context: 'PostgresProfiling' },
      );
    });

    it('does not warn', async () => {
      await writePostgresExplainPlan(loggerConfig, buildEntry());

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('logs class.method, the SQL and the JSON plan at debug', async () => {
      const entry = buildEntry();

      await writePostgresExplainPlan(loggerConfig, entry);

      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(debugSpy).toHaveBeenCalledWith(
        [
          'UserRepository.findActive',
          entry.query,
          JSON.stringify(entry.plan, null, 2),
        ].join('\n'),
        { context: 'PostgresProfiling' },
      );
    });

    it('keeps the SQL and the JSON plan out of the summary line', async () => {
      await writePostgresExplainPlan(loggerConfig, buildEntry());

      expect(String(infoSpy.mock.calls[0]?.[0])).not.toContain(
        'SELECT * FROM users',
      );
    });
  });

  describe('when the entry carries a method duration', () => {
    it('adds took= to the logged summary line', async () => {
      await writePostgresExplainPlan(
        loggerConfig,
        buildEntry({ durationMs: 812.4 }),
      );

      expect(infoSpy).toHaveBeenCalledWith(
        'UserRepository.findActive → Index Scan users via PK_users [cond: id = $1] | took=812ms rows≈1 cost=8.17',
        { context: 'PostgresProfiling' },
      );
    });

    it('writes the raw durationMs into the file-mode summary', async () => {
      await writePostgresExplainPlan(
        fileConfig,
        buildEntry({ durationMs: 812.4 }),
      );

      const written: unknown = JSON.parse(String(writtenFileContent(0)));

      expect(written).toMatchObject({
        summary: {
          durationMs: 812.4,
          line: 'Index Scan users via PK_users [cond: id = $1] | took=812ms rows≈1 cost=8.17',
        },
      });
    });
  });

  describe('when mode is logger and the plan has a Seq Scan', () => {
    const seqScanEntry = buildEntry({
      className: 'OrganizationsRepository',
      methodName: 'findByPaginated',
      plan: ORGANIZATIONS_EXPLAIN_OUTPUT,
    });

    it('warns instead of logging', async () => {
      await writePostgresExplainPlan(loggerConfig, seqScanEntry);

      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('starts the warning with the summary line', async () => {
      await writePostgresExplainPlan(loggerConfig, seqScanEntry);

      expect(String(warnSpy.mock.calls[0]?.[0])).toContain(
        'OrganizationsRepository.findByPaginated → Seq Scan organizations [filter: deleted_at IS NULL]; Sort(updated_at DESC) | rows≈1 cost=10.52',
      );
    });

    it('notes that a Seq Scan on a small local table is not proof of a missing index', async () => {
      await writePostgresExplainPlan(loggerConfig, seqScanEntry);

      expect(String(warnSpy.mock.calls[0]?.[0])).toContain(
        'Local tables are small',
      );
      expect(String(warnSpy.mock.calls[0]?.[0])).not.toContain('\n');
    });

    it('still logs the full SQL and JSON plan at debug', async () => {
      await writePostgresExplainPlan(loggerConfig, seqScanEntry);

      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(String(debugSpy.mock.calls[0]?.[0])).toContain(
        JSON.stringify(ORGANIZATIONS_EXPLAIN_OUTPUT, null, 2),
      );
    });
  });

  describe('when mode is logger and the plan shape was unexpected', () => {
    const rawEntry = buildEntry({ plan: [{ unexpected: true }] });

    it('logs the SQL and raw plan as before, without a summary', async () => {
      await writePostgresExplainPlan(loggerConfig, rawEntry);

      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledWith(
        [
          'UserRepository.findActive',
          rawEntry.query,
          JSON.stringify(rawEntry.plan, null, 2),
        ].join('\n'),
        { context: 'PostgresProfiling' },
      );
    });

    it('neither warns nor logs at debug', async () => {
      await writePostgresExplainPlan(loggerConfig, rawEntry);

      expect(warnSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
    });
  });

  describe('when mode is logger', () => {
    it('logs each statement of one method on its own line', async () => {
      await writePostgresExplainPlan(loggerConfig, buildEntry());
      await writePostgresExplainPlan(
        loggerConfig,
        buildEntry({ query: 'SELECT COUNT(*) FROM users' }),
      );

      expect(infoSpy).toHaveBeenCalledTimes(2);
    });

    it('does not touch the filesystem', async () => {
      await writePostgresExplainPlan(loggerConfig, buildEntry());

      expect(mkdirMock).not.toHaveBeenCalled();
      expect(writeFileMock).not.toHaveBeenCalled();
    });

    it('uses the PostgresProfiling logger context', async () => {
      await writePostgresExplainPlan(loggerConfig, buildEntry());

      expect(infoSpy.mock.calls[0]?.[1]).toEqual({
        context: 'PostgresProfiling',
      });
      expect(debugSpy.mock.calls[0]?.[1]).toEqual({
        context: 'PostgresProfiling',
      });
    });
  });

  describe('when mode is file', () => {
    it('creates the output directory recursively', async () => {
      await writePostgresExplainPlan(fileConfig, buildEntry());

      expect(mkdirMock).toHaveBeenCalledWith('/tmp/plans', {
        recursive: true,
      });
    });

    it('writes under the configured output directory', async () => {
      await writePostgresExplainPlan(
        { mode: 'file', outputDir: '/var/plans' },
        buildEntry(),
      );

      expect(mkdirMock).toHaveBeenCalledWith('/var/plans', { recursive: true });
      expect(writtenFilePath(0).startsWith(join('/var/plans', ''))).toBe(true);
    });

    it('writes <ClassName>.<methodName>.<timestamp>-<n>.json with a filesystem-safe timestamp', async () => {
      await writePostgresExplainPlan(fileConfig, buildEntry());

      const filePath = writtenFilePath(0);

      expect(filePath).toMatch(
        new RegExp(
          `^${join('/tmp/plans', 'UserRepository.findActive.2026-01-02T03-04-05-678Z-').replace(/[.\\/]/g, '\\$&')}\\d+\\.json$`,
        ),
      );
      expect(filePath).not.toContain(':');
    });

    it('writes pretty-printed JSON of the entry with a summary field', async () => {
      const entry = buildEntry();

      await writePostgresExplainPlan(fileConfig, entry);

      expect(writtenFileContent(0)).toBe(
        JSON.stringify(
          {
            ...entry,
            summary: summarizeExplainPlan(USERS_INDEX_SCAN_EXPLAIN_OUTPUT),
          },
          null,
          2,
        ),
      );
    });

    it('writes the structured summary and its line next to the full plan', async () => {
      await writePostgresExplainPlan(
        fileConfig,
        buildEntry({ plan: ORGANIZATIONS_EXPLAIN_OUTPUT }),
      );

      const written: unknown = JSON.parse(String(writtenFileContent(0)));

      expect(written).toMatchObject({
        plan: ORGANIZATIONS_EXPLAIN_OUTPUT,
        summary: {
          estimatedRows: 1,
          hasSeqScan: true,
          line: 'Seq Scan organizations [filter: deleted_at IS NULL]; Sort(updated_at DESC) | rows≈1 cost=10.52',
          scans: [{ nodeType: 'Seq Scan', relation: 'organizations' }],
          sorts: [{ sortKey: ['updated_at DESC'] }],
          totalCost: 10.52,
        },
      });
    });

    it('writes the entry unchanged, without a summary, when the plan shape was unexpected', async () => {
      const entry = buildEntry({ plan: [{ unexpected: true }] });

      await writePostgresExplainPlan(fileConfig, entry);

      expect(writtenFileContent(0)).toBe(JSON.stringify(entry, null, 2));
    });

    it('does not warn or log at debug for a Seq Scan', async () => {
      await writePostgresExplainPlan(
        fileConfig,
        buildEntry({ plan: ORGANIZATIONS_EXPLAIN_OUTPUT }),
      );

      expect(warnSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('does not log the plan', async () => {
      await writePostgresExplainPlan(fileConfig, buildEntry());

      expect(infoSpy).not.toHaveBeenCalled();
    });

    it('gives two plans written in the same millisecond different file names', async () => {
      await writePostgresExplainPlan(fileConfig, buildEntry());
      await writePostgresExplainPlan(fileConfig, buildEntry());

      expect(writtenFilePath(0)).not.toEqual(writtenFilePath(1));
    });

    it('creates the directory before writing the file', async () => {
      await writePostgresExplainPlan(fileConfig, buildEntry());

      expect(mkdirMock.mock.invocationCallOrder[0]).toBeLessThan(
        writeFileMock.mock.invocationCallOrder[0] ?? 0,
      );
    });
  });

  describe('when the directory cannot be created', () => {
    it('resolves and logs a warning', async () => {
      mkdirMock.mockRejectedValue(new Error('EACCES'));

      await expect(
        writePostgresExplainPlan(fileConfig, buildEntry()),
      ).resolves.toBeUndefined();

      expect(writeFileMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        'Could not write explain plan for UserRepository.findActive: EACCES',
        { context: 'PostgresProfiling' },
      );
    });
  });

  describe('when the file cannot be written', () => {
    it('resolves and logs a warning', async () => {
      writeFileMock.mockRejectedValue(new Error('ENOSPC'));

      await expect(
        writePostgresExplainPlan(fileConfig, buildEntry()),
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(
        'Could not write explain plan for UserRepository.findActive: ENOSPC',
        { context: 'PostgresProfiling' },
      );
    });

    it('stringifies a non-Error rejection', async () => {
      writeFileMock.mockRejectedValue('disk gone');

      await writePostgresExplainPlan(fileConfig, buildEntry());

      expect(warnSpy).toHaveBeenCalledWith(
        'Could not write explain plan for UserRepository.findActive: disk gone',
        { context: 'PostgresProfiling' },
      );
    });
  });

  describe('when the plan cannot be serialized in logger mode', () => {
    it('resolves and logs a warning', async () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      await expect(
        writePostgresExplainPlan(loggerConfig, buildEntry({ plan: circular })),
      ).resolves.toBeUndefined();

      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
