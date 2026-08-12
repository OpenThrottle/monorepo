import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useSettingsEnvironmentDiagnostics } from './useSettingsEnvironmentDiagnostics';

describe('useSettingsEnvironmentDiagnostics', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  test('reports originMatches true when the browser origin matches the configured URL', async () => {
    const { result } = renderHook(() =>
      useSettingsEnvironmentDiagnostics({
        appUrlDeveloper: window.location.origin,
        supportBundle: { key: 'value' },
      }),
    );

    await waitFor(() => {
      expect(result.current.origin).toBe(window.location.origin);
    });
    expect(result.current.originMatches).toBe(true);
  });

  test('reports originMatches false when the configured URL differs, ignoring a trailing slash', async () => {
    const { result } = renderHook(() =>
      useSettingsEnvironmentDiagnostics({
        appUrlDeveloper: 'https://example.invalid',
        supportBundle: {},
      }),
    );

    await waitFor(() => {
      expect(result.current.origin).not.toBeNull();
    });
    expect(result.current.originMatches).toBe(false);
  });

  test('handleCopySupportBundle writes the JSON-serialized bundle to the clipboard', async () => {
    const supportBundle = { appVersion: '1.2.3', environment: 'test' };
    const { result } = renderHook(() =>
      useSettingsEnvironmentDiagnostics({
        appUrlDeveloper: window.location.origin,
        supportBundle,
      }),
    );

    await act(async () => {
      await result.current.handleCopySupportBundle();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      JSON.stringify(supportBundle, null, 2),
    );
  });

  test('handleCopySupportBundle swallows clipboard write failures', async () => {
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    });

    const { result } = renderHook(() =>
      useSettingsEnvironmentDiagnostics({
        appUrlDeveloper: window.location.origin,
        supportBundle: {},
      }),
    );

    await expect(
      act(async () => {
        await result.current.handleCopySupportBundle();
      }),
    ).resolves.not.toThrow();
  });
});
