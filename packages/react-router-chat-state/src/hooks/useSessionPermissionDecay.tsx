import { useSetAtom } from 'jotai';
import * as React from 'react';

import { CHAT_TOOLBAR_SESSION_SENTINEL_KEY } from '../config/chat-session-permission-decay';
import { chatToolbarStateAtom } from '../data/atom.chat-toolbar';
import { decayElevatedPermissionModes } from '../utils/chat-toolbar-decay';

/**
 * @description Boot hook that runs {@link decayElevatedPermissionModes} once per
 * browser session. Uses a `sessionStorage` sentinel — absent on a fresh session
 * / new tab, present after the first run — so an elevated permission mode is
 * always a deliberate per-session opt-in but still survives reloads within the
 * same tab. SSR-safe (no-ops without `window`) and resilient when
 * `sessionStorage` is unavailable (private mode): it decays once for the mount
 * rather than throwing. The persisted write goes through the toolbar atom, so
 * the pure reconciler stays untouched. Mount it in each app's chat controller.
 * @public
 */
export function useSessionPermissionDecay(): void {
  // Hooks
  const setToolbarState = useSetAtom(chatToolbarStateAtom);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (
        window.sessionStorage.getItem(CHAT_TOOLBAR_SESSION_SENTINEL_KEY) != null
      ) {
        return;
      }
      window.sessionStorage.setItem(CHAT_TOOLBAR_SESSION_SENTINEL_KEY, '1');
    } catch {
      // sessionStorage unavailable (e.g. privacy mode). Fall through and decay
      // once for this mount; without a sentinel it may re-run on the next mount,
      // which is harmless because the decay is idempotent.
    }

    setToolbarState((previous) => decayElevatedPermissionModes(previous));
  }, [setToolbarState]);

  // 🔌 Short Circuit
}
