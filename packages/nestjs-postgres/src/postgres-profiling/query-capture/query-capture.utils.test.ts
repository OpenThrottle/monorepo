import { describe, expect, it } from 'vitest';

import { captureQuery, runWithQueryCapture } from './query-capture.utils.ts';

/**
 * @description Yields `turns` macrotasks. Concurrent scopes interleave in turn
 * order, so the test controls the ordering without reading the clock.
 */
const yieldTurns = async (turns: number): Promise<void> => {
  for (let turn = 0; turn < turns; turn += 1) {
    // eslint-disable-next-line no-await-in-loop -- each turn must finish before the next starts
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
};

describe('query capture store', () => {
  describe('outside a capture scope', () => {
    it('ignores captured queries', async () => {
      captureQuery({ query: 'SELECT 1' });

      const { queries } = await runWithQueryCapture(() => undefined);

      expect(queries).toEqual([]);
    });
  });

  describe('inside a capture scope', () => {
    it('collects queries in order with their parameters', async () => {
      const { queries } = await runWithQueryCapture(() => {
        captureQuery({ parameters: [1], query: 'SELECT $1' });
        captureQuery({ query: 'SELECT 2' });
      });

      expect(queries).toEqual([
        { parameters: [1], query: 'SELECT $1' },
        { query: 'SELECT 2' },
      ]);
    });

    it('returns the value of the wrapped function', async () => {
      const capture = await runWithQueryCapture(async () => 'done');

      expect(capture).toEqual({ ok: true, queries: [], value: 'done' });
    });

    it('collects queries captured after an await', async () => {
      const { queries } = await runWithQueryCapture(async () => {
        await yieldTurns(1);
        captureQuery({ query: 'SELECT after_await' });
      });

      expect(queries).toEqual([{ query: 'SELECT after_await' }]);
    });

    it('stops capturing once the scope ends', async () => {
      const { queries } = await runWithQueryCapture(() => undefined);

      captureQuery({ query: 'SELECT after_scope' });

      expect(queries).toEqual([]);
    });
  });

  describe('when the wrapped function throws', () => {
    const error = new Error('boom');

    it('returns a synchronous error with the queries captured before it', async () => {
      const capture = await runWithQueryCapture(() => {
        captureQuery({ query: 'SELECT before_throw' });
        throw error;
      });

      expect(capture).toEqual({
        error,
        ok: false,
        queries: [{ query: 'SELECT before_throw' }],
      });
    });

    it('returns a rejection with the queries captured before it', async () => {
      const capture = await runWithQueryCapture(async () => {
        captureQuery({ query: 'SELECT before_reject' });
        await yieldTurns(1);
        throw error;
      });

      expect(capture).toEqual({
        error,
        ok: false,
        queries: [{ query: 'SELECT before_reject' }],
      });
    });
  });

  describe('with concurrent scopes', () => {
    it('keeps each scope isolated', async () => {
      const [first, second] = await Promise.all([
        runWithQueryCapture(async () => {
          captureQuery({ query: 'SELECT first_1' });
          await yieldTurns(2);
          captureQuery({ query: 'SELECT first_2' });
        }),
        runWithQueryCapture(async () => {
          await yieldTurns(1);
          captureQuery({ query: 'SELECT second_1' });
        }),
      ]);

      expect(first.queries.map(({ query }) => query)).toEqual([
        'SELECT first_1',
        'SELECT first_2',
      ]);
      expect(second.queries.map(({ query }) => query)).toEqual([
        'SELECT second_1',
      ]);
    });
  });

  describe('with a nested scope', () => {
    it('captures into the innermost scope only', async () => {
      const outer = await runWithQueryCapture(async () => {
        captureQuery({ query: 'SELECT outer' });
        const inner = await runWithQueryCapture(() => {
          captureQuery({ query: 'SELECT inner' });
        });

        return inner.queries;
      });

      expect(outer).toEqual({
        ok: true,
        queries: [{ query: 'SELECT outer' }],
        value: [{ query: 'SELECT inner' }],
      });
    });
  });

  describe('with an EXPLAIN statement', () => {
    it.each([
      'EXPLAIN SELECT 1',
      'explain (analyze) SELECT 1',
      '  \n EXPLAIN ANALYZE SELECT 1',
    ])('never captures %j', async (statement) => {
      const { queries } = await runWithQueryCapture(() => {
        captureQuery({ query: statement });
      });

      expect(queries).toEqual([]);
    });

    it('still captures statements that merely contain EXPLAIN', async () => {
      const { queries } = await runWithQueryCapture(() => {
        captureQuery({ query: "SELECT 'EXPLAIN'" });
      });

      expect(queries).toHaveLength(1);
    });
  });
});
