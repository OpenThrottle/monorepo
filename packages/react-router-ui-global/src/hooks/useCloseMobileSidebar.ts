import { useSidebar } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

/**
 * @description Returns a handler that closes the sidebar sheet on phones, where it covers
 * the page. On desktop it does nothing, so the open/collapsed state is left alone.
 */
export const useCloseMobileSidebar = (): (() => void) => {
  // Hooks
  const { isMobile, setOpenMobile } = useSidebar();

  // Setup

  // Handlers
  const closeMobileSidebar = React.useCallback((): void => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return closeMobileSidebar;
};
