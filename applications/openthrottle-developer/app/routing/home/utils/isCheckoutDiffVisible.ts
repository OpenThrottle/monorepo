import { CHAT_SESSION_DRAWER_SECTIONS } from '@openthrottle/react-router-chat';

import type { UseSessionDrawerResult } from '~/routing/home/hooks/useSessionDrawer';

/**
 * @description Whether anything that reads the checkout diff can be seen: the
 * drawer (inline column or sheet) is open and the Changes section (files) or the
 * Environment section (live branch and pull request) is expanded. Gates the
 * checkout diff fetch.
 */
export const isCheckoutDiffVisible = (
  drawer: Pick<
    UseSessionDrawerResult,
    'collapsedSections' | 'isOpen' | 'isSheetOpen'
  >,
): boolean => {
  const isDrawerShown = drawer.isOpen || drawer.isSheetOpen;
  const readers = [
    CHAT_SESSION_DRAWER_SECTIONS.CHANGES,
    CHAT_SESSION_DRAWER_SECTIONS.ENVIRONMENT,
  ];
  const isReaderExpanded = readers.some(
    (section) => !drawer.collapsedSections.includes(section),
  );

  return isDrawerShown && isReaderExpanded;
};
