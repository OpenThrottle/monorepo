/**
 * @description Lifecycle tests for the background-activity registry: start → grow/rebase →
 * progress → list → finish, plus the best-effort paths (no Redis, Redis erroring, expired keys).
 *
 * Redis is an in-memory stand-in that emulates the four Lua scripts by what they do, the way the
 * directory-lock tests emulate theirs. The scripts themselves run against real Redis in the
 * plan's live verification.
 */

import type { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import type { Redis } from 'ioredis';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BACKGROUND_ACTIVITY_MAX_SAMPLES } from './background-activity-registry.constants.ts';
import { BackgroundActivityRegistryService } from './background-activity-registry.service.ts';

const START = 1_700_000_000_000;
const ID = 'embeddings_backfill:code';

interface FakeRedis {
  readonly evalMock: ReturnType<typeof vi.fn>;
  readonly hashes: Map<string, Map<string, string>>;
  readonly lists: Map<string, string[]>;
  readonly redis: Redis;
  readonly sets: Map<string, Set<string>>;
}

const fakeRedis = (): FakeRedis => {
  const hashes = new Map<string, Map<string, string>>();
  const lists = new Map<string, string[]>();
  const sets = new Map<string, Set<string>>();

  const hash = (key: string): Map<string, string> => {
    const existing = hashes.get(key);

    if (existing) {
      return existing;
    }

    const created = new Map<string, string>();

    hashes.set(key, created);

    return created;
  };

  const evalScript = async (
    script: string,
    numKeys: number,
    ...rest: (number | string)[]
  ): Promise<unknown> => {
    const keys = rest.slice(0, numKeys).map(String);
    const args = rest.slice(numKeys).map(String);
    const [hashKey = '', samplesKey = '', indexKey = ''] = keys;
    const exists = hashes.has(hashKey);

    if (script.includes("'startedAt', ARGV[5]")) {
      const [id = '', kind = '', label = '', total = '', now = ''] = args;
      const created = !exists;

      if (created) {
        const entry = hash(hashKey);

        entry.set('id', id);
        entry.set('kind', kind);
        entry.set('startedAt', now);
        entry.set('progressedAt', now);
        entry.set('done', '0');
        entry.set('total', total);
        lists.set(samplesKey, [`${now}:0`]);
      }

      hash(hashKey).set('label', label);
      sets.set(indexKey, (sets.get(indexKey) ?? new Set()).add(id));

      return created ? 1 : 0;
    }

    if (script.includes("redis.call('hincrby', KEYS[1], 'total'")) {
      const entry = hashes.get(hashKey);

      if (!entry || entry.get('total') === '') {
        return 0;
      }

      entry.set('total', String(Number(entry.get('total')) + Number(args[0])));

      return 1;
    }

    if (script.includes('done + tonumber(ARGV[1])')) {
      const entry = hashes.get(hashKey);

      if (!entry) {
        return 0;
      }

      entry.set('total', String(Number(entry.get('done')) + Number(args[0])));

      return 1;
    }

    if (script.includes("'done', ARGV[1]")) {
      const entry = hashes.get(hashKey);

      if (!entry) {
        return null;
      }

      const [by = '0', now = '', , lastIndex = '0'] = args;
      const done = Number(entry.get('done')) + Number(by);

      entry.set('done', String(done));
      entry.set('progressedAt', now);
      lists.set(
        samplesKey,
        [`${now}:${done}`, ...(lists.get(samplesKey) ?? [])].slice(
          0,
          Number(lastIndex) + 1,
        ),
      );

      return [done, entry.get('total') ?? ''];
    }

    throw new Error('unexpected script');
  };

  const evalMock = vi.fn(evalScript);
  const redis = {
    del: vi.fn(async (...keys: string[]) => {
      keys.forEach((key) => {
        hashes.delete(key);
        lists.delete(key);
      });

      return keys.length;
    }),
    eval: evalMock,
    hgetall: vi.fn(async (key: string) => {
      return Object.fromEntries(hashes.get(key) ?? new Map());
    }),
    lrange: vi.fn(async (key: string) => {
      return lists.get(key) ?? [];
    }),
    smembers: vi.fn(async (key: string) => {
      return [...(sets.get(key) ?? new Set())];
    }),
    srem: vi.fn(async (key: string, ...members: string[]) => {
      members.forEach((member) => {
        sets.get(key)?.delete(member);
      });

      return members.length;
    }),
  };

  return { evalMock, hashes, lists, redis: asMock<Redis>(redis), sets };
};

const logger = (): LoggerService => {
  return asMock<LoggerService>({ warn: vi.fn() });
};

const START_INPUT = {
  id: ID,
  kind: 'embeddings_backfill',
  label: 'Re-embedding code chunks',
  total: 0,
} as const;

describe('BackgroundActivityRegistryService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('lifecycle', () => {
    it('lists nothing when idle', async () => {
      const { redis } = fakeRedis();
      const registry = new BackgroundActivityRegistryService(logger(), redis);

      await expect(registry.list()).resolves.toEqual([]);
    });

    it('starts once, keeps startedAt on a re-start, and lists the activity', async () => {
      const { redis } = fakeRedis();
      const registry = new BackgroundActivityRegistryService(logger(), redis);

      await expect(registry.start(START_INPUT)).resolves.toBe(true);
      await registry.grow(ID, 100);
      vi.setSystemTime(START + 60_000);
      await expect(
        registry.start({ ...START_INPUT, label: 'Re-embedding code' }),
      ).resolves.toBe(false);

      const [activity] = await registry.list();

      expect(activity).toMatchObject({
        done: 0,
        id: ID,
        label: 'Re-embedding code',
        startedAt: new Date(START),
        total: 100,
      });
    });

    it('reports progress, derives an ETA, and clears on finish', async () => {
      const { redis } = fakeRedis();
      const registry = new BackgroundActivityRegistryService(logger(), redis);

      await registry.start(START_INPUT);
      await registry.grow(ID, 100);

      const steps = [10, 20, 30];

      for (const [index] of steps.entries()) {
        vi.setSystemTime(START + (index + 1) * 10_000);
        // eslint-disable-next-line no-await-in-loop -- each report is a point in time
        await registry.progress(ID, 10);
      }

      const [activity] = await registry.list();

      expect(activity).toMatchObject({ done: 30, status: 'running' });
      // 1 unit/s with 70 left.
      expect(activity?.etaSeconds).toBe(70);

      await registry.finish(ID);

      await expect(registry.list()).resolves.toEqual([]);
    });

    it('returns done and total from progress, and null once finished', async () => {
      const { redis } = fakeRedis();
      const registry = new BackgroundActivityRegistryService(logger(), redis);

      await registry.start(START_INPUT);
      await registry.grow(ID, 5);

      await expect(registry.progress(ID, 5)).resolves.toEqual({
        done: 5,
        total: 5,
      });

      await registry.finish(ID);

      await expect(registry.progress(ID, 1)).resolves.toBeNull();
    });

    it('rebases total on what is left', async () => {
      const { redis } = fakeRedis();
      const registry = new BackgroundActivityRegistryService(logger(), redis);

      await registry.start(START_INPUT);
      await registry.grow(ID, 100);
      await registry.progress(ID, 40);
      await registry.rebase(ID, 10);

      const [activity] = await registry.list();

      expect(activity).toMatchObject({ done: 40, total: 50 });
    });

    it('serves an unknown total as indeterminate and never grows it', async () => {
      const { redis } = fakeRedis();
      const registry = new BackgroundActivityRegistryService(logger(), redis);

      await registry.start({ ...START_INPUT, total: null });
      await registry.grow(ID, 10);
      await registry.progress(ID, 3);

      const [activity] = await registry.list();

      expect(activity).toMatchObject({
        done: 3,
        etaSeconds: null,
        total: null,
      });
    });

    it('keeps at most the configured number of samples', async () => {
      const { lists, redis } = fakeRedis();
      const registry = new BackgroundActivityRegistryService(logger(), redis);

      await registry.start(START_INPUT);

      const reports = Array.from({
        length: BACKGROUND_ACTIVITY_MAX_SAMPLES + 5,
      });

      for (const [index] of reports.entries()) {
        vi.setSystemTime(START + index * 1000);
        // eslint-disable-next-line no-await-in-loop -- each report is a point in time
        await registry.progress(ID, 1);
      }

      const [samples] = [...lists.values()];

      expect(samples).toHaveLength(BACKGROUND_ACTIVITY_MAX_SAMPLES);
    });
  });

  describe('expired activities', () => {
    it('drops an activity whose hash expired from the index', async () => {
      const { hashes, redis, sets } = fakeRedis();
      const registry = new BackgroundActivityRegistryService(logger(), redis);

      await registry.start(START_INPUT);
      hashes.clear();

      await expect(registry.list()).resolves.toEqual([]);
      expect([...sets.values()].every((set) => set.size === 0)).toBe(true);
    });
  });

  describe('best-effort', () => {
    it('is a no-op without Redis', async () => {
      const registry = new BackgroundActivityRegistryService(logger(), null);

      await expect(registry.start(START_INPUT)).resolves.toBe(false);
      await expect(registry.progress(ID, 1)).resolves.toBeNull();
      await expect(registry.finish(ID)).resolves.toBeUndefined();
      await expect(registry.list()).resolves.toEqual([]);
    });

    it('logs and swallows a Redis error', async () => {
      const { evalMock, redis } = fakeRedis();
      const log = logger();
      const registry = new BackgroundActivityRegistryService(log, redis);

      evalMock.mockRejectedValue(new Error('connection lost'));

      await expect(registry.progress(ID, 1)).resolves.toBeNull();
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('connection lost'),
        BackgroundActivityRegistryService.name,
      );
    });
  });
});
