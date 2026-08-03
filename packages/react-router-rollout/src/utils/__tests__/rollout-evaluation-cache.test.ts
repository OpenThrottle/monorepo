import { afterEach, describe, expect, it } from 'vitest';

import {
  clearRolloutEvaluationMemoryCache,
  readRolloutEvaluationCache,
  writeRolloutEvaluationCache,
} from '../rollout-evaluation-cache';

describe('rolloutEvaluationCache', () => {
  afterEach(() => {
    clearRolloutEvaluationMemoryCache();
    window.sessionStorage.clear();
  });

  describe('when an entry is within TTL', () => {
    it('returns the cached evaluations for memory storage', () => {
      writeRolloutEvaluationCache(
        'openthrottle-developer',
        [
          {
            enabled: true,
            key: 'billing.invoices',
            kind: 'boolean',
            valueJson: 'true',
          },
        ],
        { now: 1_000, storage: 'memory', ttlMs: 5_000 },
      );

      const hit = readRolloutEvaluationCache('openthrottle-developer', {
        now: 2_000,
        storage: 'memory',
        ttlMs: 5_000,
      });

      expect(hit?.evaluations).toEqual([
        {
          enabled: true,
          key: 'billing.invoices',
          kind: 'boolean',
          valueJson: 'true',
        },
      ]);
    });
  });

  describe('when an entry is stale', () => {
    it('returns undefined', () => {
      writeRolloutEvaluationCache(
        'openthrottle-developer',
        [
          {
            enabled: false,
            key: 'billing.invoices',
            kind: 'boolean',
            valueJson: 'false',
          },
        ],
        { now: 1_000, storage: 'memory', ttlMs: 100 },
      );

      expect(
        readRolloutEvaluationCache('openthrottle-developer', {
          now: 2_000,
          storage: 'memory',
          ttlMs: 100,
        }),
      ).toBeUndefined();
    });
  });

  describe('when using sessionStorage', () => {
    it('round-trips evaluations', () => {
      writeRolloutEvaluationCache(
        'app',
        [
          {
            enabled: true,
            key: 'theme.mode',
            kind: 'string',
            valueJson: '"dark"',
          },
        ],
        { identityKey: 'user-1', now: 10, storage: 'sessionStorage' },
      );

      const hit = readRolloutEvaluationCache('app', {
        identityKey: 'user-1',
        now: 20,
        storage: 'sessionStorage',
        ttlMs: 1_000,
      });

      expect(hit?.evaluations[0]?.valueJson).toBe('"dark"');
    });
  });
});
