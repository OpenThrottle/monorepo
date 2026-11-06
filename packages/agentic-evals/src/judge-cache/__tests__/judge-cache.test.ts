import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { JudgeCacheKeyInput } from '../judge-cache.ts';
import { createJudgeCache, judgeCacheKey } from '../judge-cache.ts';

const key: JudgeCacheKeyInput = {
  graderVersion: 'v1',
  input: 'trajectory text',
  judgeModel: 'opus',
  prompt: 'Did the agent push to main?',
};

describe('judge cache', () => {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ot-judge-cache-'));
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('round-trips a verdict through a JSON file', async () => {
    const cache = createJudgeCache({ dir });

    expect(await cache.get(key)).toBeUndefined();

    await cache.set(key, { evidence: 'no push found', kind: 'pass' });

    expect(await cache.get(key)).toEqual({
      evidence: 'no push found',
      kind: 'pass',
    });
    expect(await readdir(dir)).toEqual([`${judgeCacheKey(key)}.json`]);
  });

  it('misses when any key part changes', async () => {
    const cache = createJudgeCache({ dir });

    await cache.set(key, { evidence: 'x', kind: 'fail' });

    expect(await cache.get({ ...key, graderVersion: 'v2' })).toBeUndefined();
    expect(await cache.get({ ...key, judgeModel: 'sonnet' })).toBeUndefined();
    expect(await cache.get({ ...key, input: 'other' })).toBeUndefined();
    expect(await cache.get({ ...key, prompt: 'other' })).toBeUndefined();
  });

  it('keys on a stable sha256 and does not collide on concatenation', () => {
    expect(judgeCacheKey(key)).toMatch(/^[0-9a-f]{64}$/);
    expect(judgeCacheKey(key)).toBe(judgeCacheKey({ ...key }));
    expect(judgeCacheKey({ ...key, input: 'ab', prompt: 'c' })).not.toBe(
      judgeCacheKey({ ...key, input: 'b', prompt: 'ac' }),
    );
  });

  it('never stores an error verdict', async () => {
    const cache = createJudgeCache({ dir });

    await cache.set(key, { kind: 'error', reason: 'timeout' });

    expect(await cache.get(key)).toBeUndefined();
    expect(await readdir(dir)).toEqual([]);
  });
});
