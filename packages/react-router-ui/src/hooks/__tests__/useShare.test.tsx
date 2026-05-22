import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useShare } from '../useShare';

const sharePayload: ShareData = {
  text: 'Hello',
  title: 'Greeting',
  url: 'https://example.com',
};

describe('useShare', () => {
  const shareMock = vi.fn();
  const canShareMock = vi.fn();

  beforeEach(() => {
    shareMock.mockResolvedValue(undefined);
    canShareMock.mockReturnValue(true);

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: canShareMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('reports isSupported when navigator.share exists', () => {
    const { result } = renderHook(() => useShare({ data: sharePayload }));

    expect(result.current.isSupported).toBe(true);
    expect(result.current.data).toEqual(sharePayload);
  });

  describe('when canShare is called', () => {
    test('delegates to navigator.canShare for default data', () => {
      const { result } = renderHook(() => useShare({ data: sharePayload }));

      expect(result.current.canShare()).toBe(true);
      expect(canShareMock).toHaveBeenCalledWith(sharePayload);
    });

    test('returns false when data is missing', () => {
      const { result } = renderHook(() => useShare());

      expect(result.current.canShare()).toBe(false);
    });
  });

  describe('when share is called', () => {
    test('invokes navigator.share with default data', async () => {
      const { result } = renderHook(() => useShare({ data: sharePayload }));

      await act(async () => {
        await result.current.share();
      });

      expect(shareMock).toHaveBeenCalledWith(sharePayload);
      expect(result.current.error).toBeNull();
      expect(result.current.isSharing).toBe(false);
    });

    test('uses override data when provided', async () => {
      const override: ShareData = { title: 'Override', url: 'https://ot.dev' };
      canShareMock.mockReturnValue(true);

      const { result } = renderHook(() => useShare({ data: sharePayload }));

      await act(async () => {
        await result.current.share(override);
      });

      expect(shareMock).toHaveBeenCalledWith(override);
    });
  });

  describe('when the user aborts the share sheet', () => {
    test('does not set error', async () => {
      shareMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      const { result } = renderHook(() => useShare({ data: sharePayload }));

      await act(async () => {
        await result.current.share();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('when navigator.share is unavailable', () => {
    test('reports isSupported false', () => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: undefined,
        writable: true,
      });

      const { result } = renderHook(() => useShare({ data: sharePayload }));

      expect(result.current.isSupported).toBe(false);
      expect(result.current.canShare()).toBe(false);
    });
  });
});
