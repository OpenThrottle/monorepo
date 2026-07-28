import * as React from 'react';
import { ChatPermissionMode } from '@openthrottle/react-router-chat';
import { useSetAtom } from 'jotai';
import {
  CHAT_TOOLBAR_STORAGE_KEY,
  chatToolbarStateAtom,
  type ChatToolbarBackendPrefs,
  type ChatToolbarState,
} from './atom.chat-toolbar';

/**
 * sessionStorage key whose presence marks that the elevated-permission decay
 * has already run for the current browser session. Derived from
 * {@link CHAT_TOOLBAR_STORAGE_KEY} so it is app-namespaced like the toolbar blob.
 * @public
 */
export const CHAT_TOOLBAR_SESSION_SENTINEL_KEY = `${CHAT_TOOLBAR_STORAGE_KEY}:session`;

/**
 * The permission modes that must not silently survive a browser session: both
 * apply changes without per-action review, so they decay to the safe default.
 * `supervised` is intentionally absent — it never decays.
 */
const ELEVATED_PERMISSION_MODES: readonly ChatPermissionMode[] = [
  ChatPermissionMode.autoAcceptEdits,
  ChatPermissionMode.fullAccess,
];

const isElevatedPermissionMode = (
  mode: ChatPermissionMode | undefined,
): boolean => mode != null && ELEVATED_PERMISSION_MODES.includes(mode);

/**
 * @description PURE safety decay: clear any elevated `permissionMode`
 * (Full access / Auto-accept edits) back to `undefined` across BOTH the global
 * field and every `perBackend` entry, leaving `supervised` and all other fields
 * untouched. A `perBackend` entry left with no remaining prefs is dropped so the
 * map never accumulates empty keys. Returns the SAME reference when nothing is
 * elevated, so callers can skip a redundant write. Idempotent — decaying an
 * already-safe state is a no-op.
 * @public
 */
export function decayElevatedPermissionModes(
  state: ChatToolbarState,
): ChatToolbarState {
  const clearGlobal = isElevatedPermissionMode(state.permissionMode);

  let perBackendChanged = false;
  const nextPerBackend: Record<string, ChatToolbarBackendPrefs> = {};
  for (const [backendKey, prefs] of Object.entries(state.perBackend)) {
    if (!isElevatedPermissionMode(prefs.permissionMode)) {
      nextPerBackend[backendKey] = prefs;
      continue;
    }

    perBackendChanged = true;
    const cleared: ChatToolbarBackendPrefs = {
      reasoning: prefs.reasoning,
      serviceTier: prefs.serviceTier,
    };
    if (cleared.reasoning !== undefined || cleared.serviceTier !== undefined) {
      nextPerBackend[backendKey] = cleared;
    }
  }

  if (!clearGlobal && !perBackendChanged) {
    return state;
  }

  return {
    ...state,
    perBackend: perBackendChanged ? nextPerBackend : state.perBackend,
    permissionMode: clearGlobal ? undefined : state.permissionMode,
  };
}

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
