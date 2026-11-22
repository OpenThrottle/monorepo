import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { assign } = vi.hoisted(() => {
  return { assign: vi.fn<(url: string) => void>() };
});

vi.mock('~/routing/auth/utils/assignDocumentLocation', () => {
  return { assignDocumentLocation: assign };
});

const { useLoginExitAnimation } = await import('../useLoginExitAnimation');

describe('useLoginExitAnimation', () => {
  beforeEach(() => {
    assign.mockClear();
  });

  test('does nothing until the login succeeds', () => {
    const { result } = renderHook(() => {
      return useLoginExitAnimation({
        isLoginOk: false,
        prefersReducedMotion: true,
        redirectUrl: '/dashboard',
      });
    });

    expect(result.current.isExiting).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });

  test('redirects immediately when motion is reduced', () => {
    const { result } = renderHook(() => {
      return useLoginExitAnimation({
        isLoginOk: true,
        prefersReducedMotion: true,
        redirectUrl: '/dashboard',
      });
    });

    expect(result.current.isExiting).toBe(false);
    expect(assign).toHaveBeenCalledWith('/dashboard');
  });

  test('starts exiting when motion is allowed', () => {
    const { result } = renderHook(() => {
      return useLoginExitAnimation({
        isLoginOk: true,
        prefersReducedMotion: false,
        redirectUrl: '/dashboard',
      });
    });

    expect(result.current.isExiting).toBe(true);
    expect(assign).not.toHaveBeenCalled();
  });
});
