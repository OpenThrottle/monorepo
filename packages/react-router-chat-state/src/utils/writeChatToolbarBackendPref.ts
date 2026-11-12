import type {
  ChatToolbarBackendPrefs,
  ChatToolbarState,
} from '../data/data.chat-toolbar-state';

/**
 * @description Last-used-wins write for the capability-gated toolbar controls
 * (permission mode, reasoning, service tier). Writes the patch under the active
 * backend's `perBackend` entry AND as the global fallback, so a backend the user
 * never touched inherits the latest choice. Every composer must write through
 * this: the reconciler reads `perBackend` first, so a surface that wrote only the
 * global field would be shadowed by an older per-backend value and the control
 * would snap back. With no backend selected, only the global field is written.
 * @public
 */
export function writeChatToolbarBackendPref(
  previous: ChatToolbarState,
  backendKey: string | undefined,
  patch: ChatToolbarBackendPrefs,
): ChatToolbarState {
  if (backendKey == null) {
    return { ...previous, ...patch };
  }

  return {
    ...previous,
    ...patch,
    perBackend: {
      ...previous.perBackend,
      [backendKey]: { ...previous.perBackend[backendKey], ...patch },
    },
  };
}
