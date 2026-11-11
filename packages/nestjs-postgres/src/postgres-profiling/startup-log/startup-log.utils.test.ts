import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POSTGRES_PROFILING_LOGGER } from '../postgres-profiling.constants.ts';
import type { PostgresProfilingEnabledSettings } from '../postgres-profiling.types.ts';
import {
  buildPostgresProfilingStartupLine,
  logPostgresProfilingStartupOnce,
  resetPostgresProfilingStartupLog,
} from './startup-log.utils.ts';

const META = { context: 'PostgresProfiling' };

const settings: PostgresProfilingEnabledSettings = {
  analyze: false,
  dedupeWindowSeconds: 300,
  enabled: true,
  invalidTargets: [],
  minDurationMs: 0,
  output: { mode: 'logger' },
  targets: [{ className: '*', methodName: '*', source: '*' }],
};

describe('startup log', () => {
  let infoSpy: MockInstance;
  let warnSpy: MockInstance;

  beforeEach(() => {
    resetPostgresProfilingStartupLog();
    infoSpy = vi
      .spyOn(POSTGRES_PROFILING_LOGGER, 'info')
      .mockImplementation(() => undefined);
    warnSpy = vi
      .spyOn(POSTGRES_PROFILING_LOGGER, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildPostgresProfilingStartupLine', () => {
    it('describes targets, analyze, mode and dedupe', () => {
      expect(buildPostgresProfilingStartupLine(settings)).toBe(
        'profiling enabled for * (analyze off, mode logger, dedupe 300s)',
      );
    });

    it('shows the dedupe window as off and the minimum duration when set', () => {
      expect(
        buildPostgresProfilingStartupLine({
          ...settings,
          analyze: true,
          dedupeWindowSeconds: 0,
          minDurationMs: 50,
        }),
      ).toBe(
        'profiling enabled for * (analyze on, mode logger, dedupe off, min 50ms)',
      );
    });
  });

  describe('logPostgresProfilingStartupOnce', () => {
    it('logs the startup line once at info with the context meta', () => {
      logPostgresProfilingStartupOnce(POSTGRES_PROFILING_LOGGER, settings);
      logPostgresProfilingStartupOnce(POSTGRES_PROFILING_LOGGER, settings);

      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledWith(
        buildPostgresProfilingStartupLine(settings),
        META,
      );
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('warns about every invalid value', () => {
      logPostgresProfilingStartupOnce(POSTGRES_PROFILING_LOGGER, {
        ...settings,
        invalidDedupeSeconds: 'x',
        invalidMinDurationMs: 'y',
        invalidMode: 'z',
        invalidTargets: ['bad'],
      });

      expect(warnSpy).toHaveBeenCalledTimes(4);
      expect(warnSpy.mock.calls.map((call) => call[1])).toEqual([
        META,
        META,
        META,
        META,
      ]);
    });

    it('logs again after the once flag is reset', () => {
      logPostgresProfilingStartupOnce(POSTGRES_PROFILING_LOGGER, settings);
      resetPostgresProfilingStartupLog();
      logPostgresProfilingStartupOnce(POSTGRES_PROFILING_LOGGER, settings);

      expect(infoSpy).toHaveBeenCalledTimes(2);
    });
  });
});
