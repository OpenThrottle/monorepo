import * as React from 'react';
import { useSetAtom } from 'jotai';
import {
  CHAT_TOOLBAR_STORAGE_KEY,
  chatToolbarStateAtom,
} from '../data/atom.chat-toolbar';
import { decayElevatedPermissionModes } from '../utils/chat-toolbar-decay';

/**
 * sessionStorage key whose presence marks that the elevated-permission decay
 * has already run for the current browser session. Derived from
 * {@link CHAT_TOOLBAR_STORAGE_KEY} so it is app-namespaced like the toolbar blob.
 * @public
 */
export const CHAT_TOOLBAR_SESSION_SENTINEL_KEY = `${CHAT_TOOLBAR_STORAGE_KEY}:session`;

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
  const setToolbarState = useSetAtom(chatToolbarStateAtom);

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
}
