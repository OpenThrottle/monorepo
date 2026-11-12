import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { markDeferredHandled } from '../markDeferredHandled';

describe('markDeferredHandled', () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown): void => {
    unhandled.push(reason);
  };

  // Node reports unhandled rejections only after the microtask queue drains.
  const flushRejectionTracking = async (): Promise<void> => {
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  };

  beforeEach(() => {
    unhandled.length = 0;
    process.on('unhandledRejection', onUnhandled);
  });

  afterEach(() => {
    process.off('unhandledRejection', onUnhandled);
  });

  test('a marked promise that rejects is not reported as unhandled', async () => {
    const rejected = Promise.reject(new Error('denied'));

    markDeferredHandled([rejected]);
    await flushRejectionTracking();

    expect(unhandled).toEqual([]);
  });

  test('the original promise still rejects for later consumers', async () => {
    const rejected = Promise.reject(new Error('denied'));

    markDeferredHandled([rejected]);

    await expect(rejected).rejects.toThrow('denied');
  });

  test('a resolving promise keeps its value', async () => {
    const resolved = Promise.resolve('ok');

    markDeferredHandled([resolved]);

    await expect(resolved).resolves.toBe('ok');
  });
});
