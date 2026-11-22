import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  appendPlanNarration,
  formatElapsed,
  readNarratedKeys,
  recordNarratedKeys,
} from '../plan-narration.ts';

const chunk = {
  content: '[hook:narration] x',
  key: 'run:task:COMPLETED',
  planId: 'plan-1',
  taskId: 'task-1',
};

describe('formatElapsed', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatElapsed(45_000)).toBe('45s');
    expect(formatElapsed(750_000)).toBe('12m 30s');
    expect(formatElapsed(3_840_000)).toBe('1h 4m');
    expect(formatElapsed(-5)).toBe('0s');
  });
});

describe('narration state', () => {
  let stateDir: string;

  beforeEach(() => {
    stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'narration-state-'));
  });

  afterEach(() => {
    fs.rmSync(stateDir, { force: true, recursive: true });
  });

  it('round-trips and merges keys per session', () => {
    recordNarratedKeys(stateDir, 'sess/1', ['a']);
    recordNarratedKeys(stateDir, 'sess/1', ['b', 'a']);
    expect([...readNarratedKeys(stateDir, 'sess/1')]).toEqual(['a', 'b']);
    expect(readNarratedKeys(stateDir, 'other').size).toBe(0);
  });

  it('reads a corrupt state file as empty', () => {
    fs.writeFileSync(path.join(stateDir, 'sess.json'), '{nope');
    expect(readNarratedKeys(stateDir, 'sess').size).toBe(0);
  });
});

describe('appendPlanNarration', () => {
  it('posts the chunk as a loop-kind, task-scoped append', async () => {
    const bodies: unknown[] = [];
    const isStored = await appendPlanNarration({
      authToken: 'tok',
      chunk,
      fetchImpl: async (_url, init) => {
        bodies.push(JSON.parse(init.body));
        return {
          json: async () => ({ data: { appendPlanOutput: { id: 'c1' } } }),
          ok: true,
          status: 200,
        };
      },
      graphqlUrl: 'http://example.test/graphql',
      timeoutMs: 100,
    });
    expect(isStored).toBe(true);
    expect(bodies[0]).toMatchObject({
      variables: {
        input: {
          content: chunk.content,
          kind: 'loop',
          planId: 'plan-1',
          taskId: 'task-1',
        },
      },
    });
  });

  it('is false, never a throw, when the server is unreachable', async () => {
    const isStored = await appendPlanNarration({
      authToken: '',
      chunk,
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED');
      },
      graphqlUrl: 'http://127.0.0.1:1/graphql',
      timeoutMs: 100,
    });
    expect(isStored).toBe(false);
  });

  it('is false with no endpoint configured', async () => {
    const isStored = await appendPlanNarration({
      authToken: '',
      chunk,
      graphqlUrl: null,
      timeoutMs: 100,
    });
    expect(isStored).toBe(false);
  });
});
