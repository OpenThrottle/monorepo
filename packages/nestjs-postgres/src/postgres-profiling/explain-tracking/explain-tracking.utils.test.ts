import { describe, expect, it } from 'vitest';

import {
  flushPostgresProfiling,
  trackPostgresProfiling,
} from './explain-tracking.utils.ts';

describe('postgres explain in-flight tracker', () => {
  describe('#flushPostgresProfiling', () => {
    it('resolves immediately when nothing is in flight', async () => {
      await expect(flushPostgresProfiling()).resolves.toBeUndefined();
    });

    it('waits for a tracked promise to settle', async () => {
      let isSettled = false;

      trackPostgresProfiling(
        new Promise<void>((resolve) => {
          setImmediate(() => {
            isSettled = true;
            resolve();
          });
        }),
      );

      await flushPostgresProfiling();

      expect(isSettled).toBe(true);
    });

    it('waits for a promise tracked while it is already waiting', async () => {
      let isLateSettled = false;

      trackPostgresProfiling(
        Promise.resolve().then(() => {
          trackPostgresProfiling(
            new Promise<void>((resolve) => {
              setImmediate(() => {
                isLateSettled = true;
                resolve();
              });
            }),
          );
        }),
      );

      await flushPostgresProfiling();

      expect(isLateSettled).toBe(true);
    });

    it('does not throw when a tracked promise rejects', async () => {
      trackPostgresProfiling(Promise.reject(new Error('boom')));

      await expect(flushPostgresProfiling()).resolves.toBeUndefined();
    });
  });
});
