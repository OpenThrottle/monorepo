import { act, renderHook, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { SessionDrawerState } from '~/routing/home/utils/session-drawer-cookie';
import { parseSessionDrawerCookie } from '~/routing/home/utils/session-drawer-cookie';

import { useSessionDrawer } from '../useSessionDrawer';

const CLOSED: SessionDrawerState = { collapsedSections: [], isOpen: false };

describe('useSessionDrawer', () => {
  afterEach(() => {
    document.cookie = 'ot_chat_session_drawer=; path=/; max-age=0';
  });

  test('starts from the initial state', () => {
    const { result } = renderHook(() => {
      return useSessionDrawer({
        initialState: { collapsedSections: ['files'], isOpen: true },
      });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.collapsedSections).toEqual(['files']);
    expect(result.current.isSheetOpen).toBe(false);
  });

  test('toggleOpen flips the drawer and persists it in the cookie', async () => {
    const { result } = renderHook(() => {
      return useSessionDrawer({ initialState: CLOSED });
    });

    act(() => {
      result.current.toggleOpen();
    });

    expect(result.current.isOpen).toBe(true);
    await waitFor(() => {
      expect(parseSessionDrawerCookie(document.cookie).isOpen).toBe(true);
    });
  });

  test('toggleSection collapses then expands a section, persisting it', async () => {
    const { result } = renderHook(() => {
      return useSessionDrawer({ initialState: CLOSED });
    });

    act(() => {
      result.current.toggleSection('files');
    });
    await waitFor(() => {
      expect(
        parseSessionDrawerCookie(document.cookie).collapsedSections,
      ).toEqual(['files']);
    });

    act(() => {
      result.current.toggleSection('files');
    });
    await waitFor(() => {
      expect(
        parseSessionDrawerCookie(document.cookie).collapsedSections,
      ).toEqual([]);
    });
  });

  describe('keyboard shortcut', () => {
    const stubViewport = (isInline: boolean): void => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => {
          return { matches: isInline };
        }),
      );
    };

    beforeEach(() => {
      stubViewport(true);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    test('⌘⇧J opens the sheet below md instead of the hidden column', async () => {
      stubViewport(false);
      const { result } = renderHook(() => {
        return useSessionDrawer({ initialState: CLOSED });
      });

      await userEvent.keyboard('{Meta>}{Shift>}j{/Shift}{/Meta}');

      expect(result.current.isSheetOpen).toBe(true);
      expect(result.current.isOpen).toBe(false);
    });

    test('⌘⇧J toggles the drawer', async () => {
      const { result } = renderHook(() => {
        return useSessionDrawer({ initialState: CLOSED });
      });

      await userEvent.keyboard('{Meta>}{Shift>}j{/Shift}{/Meta}');

      expect(result.current.isOpen).toBe(true);
    });

    test('Ctrl+Shift+J toggles the drawer', async () => {
      const { result } = renderHook(() => {
        return useSessionDrawer({
          initialState: { collapsedSections: [], isOpen: true },
        });
      });

      await userEvent.keyboard('{Control>}{Shift>}j{/Shift}{/Control}');

      expect(result.current.isOpen).toBe(false);
    });

    test('plain ⌘J (the conversation dock) leaves it alone', async () => {
      const { result } = renderHook(() => {
        return useSessionDrawer({ initialState: CLOSED });
      });

      await userEvent.keyboard('{Meta>}j{/Meta}');

      expect(result.current.isOpen).toBe(false);
    });
  });

  test('keeps the environment the composer reports', () => {
    const { result } = renderHook(() => {
      return useSessionDrawer({ initialState: CLOSED });
    });

    act(() => {
      result.current.setEnvironment({
        agentLabel: undefined,
        checkout: undefined,
        modelLabel: 'Opus',
        permissionMode: undefined,
        reasoning: undefined,
      });
    });

    expect(result.current.environment?.modelLabel).toBe('Opus');
  });
});
