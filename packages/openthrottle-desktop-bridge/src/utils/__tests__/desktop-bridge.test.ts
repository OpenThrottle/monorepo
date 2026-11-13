import { afterEach, describe, expect, test, vi } from 'vitest';

import { DESKTOP_BRIDGE_NAME } from '../../data/data.desktop-bridge.ts';
import { getDesktopBridge } from '../desktop-bridge.ts';

const bridge = {
  notify: () => Promise.resolve({ ok: true, shown: false }),
  openExternal: () => Promise.resolve({ ok: true }),
  platform: 'darwin',
  version: '1.0.0',
};

describe('getDesktopBridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('is undefined when the global is absent', () => {
    expect(getDesktopBridge()).toBeUndefined();
  });

  test('returns a well-formed bridge', () => {
    vi.stubGlobal(DESKTOP_BRIDGE_NAME, bridge);

    expect(getDesktopBridge()).toBe(bridge);
  });

  test.each([
    ['null', null],
    ['a string', 'x'],
    ['a partial bridge', { platform: 'darwin' }],
    ['wrong member types', { ...bridge, notify: 'no' }],
  ])('is undefined for %s', (_label, value) => {
    vi.stubGlobal(DESKTOP_BRIDGE_NAME, value);

    expect(getDesktopBridge()).toBeUndefined();
  });
});
