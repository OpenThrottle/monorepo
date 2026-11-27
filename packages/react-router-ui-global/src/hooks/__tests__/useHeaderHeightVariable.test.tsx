import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useHeaderHeightVariable } from '../useHeaderHeightVariable';

const VARIABLE = '--global-header-height';

describe('useHeaderHeightVariable', () => {
  let resize: (() => void) | undefined;
  let disconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        disconnect = disconnect;
        observe = vi.fn();
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty(VARIABLE);
    resize = undefined;
  });

  describe('with a header', () => {
    test('publishes its height and follows resizes', () => {
      const header = document.createElement('nav');
      Object.defineProperty(header, 'offsetHeight', {
        configurable: true,
        value: 52,
      });
      const headerRef = { current: header };

      renderHook(() => useHeaderHeightVariable({ headerRef }));

      const root = document.documentElement;
      expect(root.style.getPropertyValue(VARIABLE)).toBe('52px');

      Object.defineProperty(header, 'offsetHeight', {
        configurable: true,
        value: 64,
      });
      resize?.();
      expect(root.style.getPropertyValue(VARIABLE)).toBe('64px');
    });

    test('removes the variable on unmount', () => {
      const headerRef = { current: document.createElement('nav') };

      const hook = renderHook(() => useHeaderHeightVariable({ headerRef }));
      hook.unmount();

      const value = document.documentElement.style.getPropertyValue(VARIABLE);
      expect(value).toBe('');
      expect(disconnect).toHaveBeenCalled();
    });
  });

  describe('without a header', () => {
    test('publishes nothing', () => {
      const headerRef = { current: null };

      renderHook(() => useHeaderHeightVariable({ headerRef }));

      const value = document.documentElement.style.getPropertyValue(VARIABLE);
      expect(value).toBe('');
    });
  });
});
