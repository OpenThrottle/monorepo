import { ChatPermissionMode } from '@openthrottle/react-router-chat';
import type {
  ChatToolbarBackendPrefs,
  ChatToolbarState,
} from '../data/atom.chat-toolbar';

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
