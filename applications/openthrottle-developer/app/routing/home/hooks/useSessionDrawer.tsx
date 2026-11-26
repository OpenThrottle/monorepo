import type { ChatSessionEnvironment } from '@openthrottle/react-router-chat';
import * as React from 'react';

import { INLINE_DRAWER_MEDIA_QUERY } from '~/routing/home/config/session-drawer';
import type { SessionDrawerState } from '~/routing/home/utils/session-drawer-cookie';
import { serializeSessionDrawerCookie } from '~/routing/home/utils/session-drawer-cookie';

export interface UseSessionDrawerOptions {
  /** The drawer state the home loader read from the cookie. */
  readonly initialState: SessionDrawerState;
}

export interface UseSessionDrawerResult {
  readonly collapsedSections: readonly string[];
  /** What the next turn runs with, as the composer last reported it. */
  readonly environment: ChatSessionEnvironment | undefined;
  /** Whether the inline column is open (md and up). */
  readonly isOpen: boolean;
  /** Whether the small-screen sheet is open. Never persisted. */
  readonly isSheetOpen: boolean;
  readonly setEnvironment: (environment: ChatSessionEnvironment) => void;
  readonly setSheetOpen: (isSheetOpen: boolean) => void;
  readonly toggleOpen: () => void;
  readonly toggleSection: (sectionId: string) => void;
}

/**
 * @description State for the home route's session drawer: whether the inline
 * column is open and which sections are collapsed — persisted in a cookie the
 * home loader reads, so a refresh renders the same layout — plus the sheet's
 * transient open state and the composer's reported environment. ⌘⇧J /
 * Ctrl+Shift+J toggles the column (the conversation dock keeps plain ⌘J).
 */
export const useSessionDrawer = (
  options: UseSessionDrawerOptions,
): UseSessionDrawerResult => {
  const { initialState } = options;

  // Hooks
  const [drawerState, setDrawerState] = React.useState(initialState);
  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [environment, setEnvironment] = React.useState<
    ChatSessionEnvironment | undefined
  >(undefined);

  // Setup

  // Handlers
  const toggleOpen = (): void => {
    setDrawerState((previous) => ({ ...previous, isOpen: !previous.isOpen }));
  };

  const toggleSection = (sectionId: string): void => {
    setDrawerState((previous) => {
      const isCollapsed = previous.collapsedSections.includes(sectionId);
      const collapsedSections = isCollapsed
        ? previous.collapsedSections.filter((id) => id !== sectionId)
        : [...previous.collapsedSections, sectionId];

      return { ...previous, collapsedSections };
    });
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    document.cookie = serializeSessionDrawerCookie(drawerState);
  }, [drawerState]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const isToggle =
        (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey;
      if (isToggle && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        // Below md the inline column is hidden, so the shortcut drives the sheet.
        const isInlineLayout =
          typeof window.matchMedia === 'function' &&
          window.matchMedia(INLINE_DRAWER_MEDIA_QUERY).matches;
        if (!isInlineLayout) {
          setSheetOpen((previous) => !previous);
          return;
        }
        setDrawerState((previous) => ({
          ...previous,
          isOpen: !previous.isOpen,
        }));
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 🔌 Short Circuit

  return {
    collapsedSections: drawerState.collapsedSections,
    environment,
    isOpen: drawerState.isOpen,
    isSheetOpen,
    setEnvironment,
    setSheetOpen,
    toggleOpen,
    toggleSection,
  };
};
