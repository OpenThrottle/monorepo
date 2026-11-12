import { describe, expect, it, vi } from 'vitest';

import { createDeepLinkRouter } from './createDeepLinkRouter.ts';

const ID = '24f3510f-6cc5-4f70-a01d-62ddbbdb3f94';

describe('createDeepLinkRouter', () => {
  it('opens the mapped route once ready', () => {
    const openRoute = vi.fn();
    const router = createDeepLinkRouter({ openRoute });

    router.markReady();
    router.handle(`openthrottle://plans/${ID}`);

    expect(openRoute).toHaveBeenCalledWith(`/plans/${ID}`);
  });

  it('queues links that arrive before ready, then flushes them', () => {
    const openRoute = vi.fn();
    const router = createDeepLinkRouter({ openRoute });

    router.handle(`openthrottle://plans/${ID}`);
    expect(openRoute).not.toHaveBeenCalled();

    router.markReady();
    expect(openRoute).toHaveBeenCalledWith(`/plans/${ID}`);
  });

  it.each(['openthrottle://plans/not-a-uuid', 'openthrottle://evil/x'])(
    'only focuses for %s',
    (url) => {
      const openRoute = vi.fn();
      const router = createDeepLinkRouter({ openRoute });

      router.markReady();
      router.handle(url);

      expect(openRoute).toHaveBeenCalledWith(undefined);
    },
  );
});
