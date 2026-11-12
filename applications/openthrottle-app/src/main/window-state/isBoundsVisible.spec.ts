import { describe, expect, it } from 'vitest';

import { isBoundsVisible } from './isBoundsVisible.ts';

const PRIMARY = { height: 900, width: 1440, x: 0, y: 0 };
const SECOND = { height: 900, width: 1440, x: 1440, y: 0 };

describe('isBoundsVisible', () => {
  it('accepts bounds inside a display', () => {
    const bounds = { height: 600, width: 800, x: 100, y: 100 };

    expect(isBoundsVisible(bounds, [PRIMARY], 64)).toBe(true);
  });

  it('accepts bounds visible on a second display', () => {
    const bounds = { height: 600, width: 800, x: 1600, y: 50 };

    expect(isBoundsVisible(bounds, [PRIMARY, SECOND], 64)).toBe(true);
  });

  it('rejects bounds on a display that is no longer connected', () => {
    const bounds = { height: 600, width: 800, x: 1600, y: 50 };

    expect(isBoundsVisible(bounds, [PRIMARY], 64)).toBe(false);
  });

  it('rejects bounds that barely touch a display', () => {
    const bounds = { height: 600, width: 800, x: 1420, y: 100 };

    expect(isBoundsVisible(bounds, [PRIMARY], 64)).toBe(false);
  });

  it('rejects everything when no display is known', () => {
    const bounds = { height: 600, width: 800, x: 0, y: 0 };

    expect(isBoundsVisible(bounds, [], 64)).toBe(false);
  });
});
