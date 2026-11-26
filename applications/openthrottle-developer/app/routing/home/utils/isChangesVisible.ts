import { CHAT_SESSION_DRAWER_SECTIONS } from '@openthrottle/react-router-chat';

import type { UseSessionDrawerResult } from '~/routing/home/hooks/useSessionDrawer';

/**
 * @description Whether the session drawer's Changes section can be seen: the
 * drawer (inline column or sheet) is open and the section is expanded. Gates
 * the checkout diff fetch.
 */
export const isChangesVisible = (
  drawer: Pick<
    UseSessionDrawerResult,
    'collapsedSections' | 'isOpen' | 'isSheetOpen'
  >,
): boolean => {
  const isDrawerShown = drawer.isOpen || drawer.isSheetOpen;
  const isCollapsed = drawer.collapsedSections.includes(
    CHAT_SESSION_DRAWER_SECTIONS.CHANGES,
  );

  return isDrawerShown && !isCollapsed;
};
