import { describe, expect, test } from 'vitest';
import * as route from '../settings.appearance';

describe('routes/settings.appearance.tsx', () => {
  test('exports no loader — the page reads appearance state from configAtom', () => {
    expect('loader' in route).toBe(false);
  });

  test('is a thin adapter: no route-level links and an Appearance breadcrumb', () => {
    expect(route.links()).toEqual([]);
    expect(route.handle.breadcrumb).toBeDefined();
  });
});
