import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { useIsDocumentHidden } from '../useIsDocumentHidden';

const setVisibilityState = (state: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
};

describe('useIsDocumentHidden', () => {
  afterEach(() => {
    Reflect.deleteProperty(document, 'visibilityState');
  });

  describe('when the document is visible', () => {
    test('returns false', () => {
      setVisibilityState('visible');

      const { result } = renderHook(() => {
        return useIsDocumentHidden();
      });

      expect(result.current).toBe(false);
    });
  });

  describe('when the document is hidden', () => {
    test('returns true', () => {
      setVisibilityState('hidden');

      const { result } = renderHook(() => {
        return useIsDocumentHidden();
      });

      expect(result.current).toBe(true);
    });
  });

  describe('when the visibility changes after mount', () => {
    test('follows visibilitychange in both directions', () => {
      setVisibilityState('visible');
      const { result } = renderHook(() => {
        return useIsDocumentHidden();
      });

      act(() => {
        setVisibilityState('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(result.current).toBe(true);

      act(() => {
        setVisibilityState('visible');
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(result.current).toBe(false);
    });
  });
});
