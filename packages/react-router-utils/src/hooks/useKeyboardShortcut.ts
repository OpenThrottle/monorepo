/**
 * useKeyboardShortcut — a small, SSR-safe primitive for window-level keyboard
 * shortcuts across the OpenThrottle RR apps.
 *
 * Modifier matching mirrors the Commander's `metaKey || ctrlKey` behavior: a
 * `meta: true` shortcut fires on Cmd (macOS) and Ctrl (elsewhere). Modifier
 * flags left `false` must NOT be pressed for a match, so `cmd+E` does not also
 * fire on a bare `E`. The editable-target guard is OFF by default so Cmd/Ctrl
 * combos work from inputs (like cmd+K); opt in with `ignoreEditableTarget` for
 * plain-key shortcuts that should pause while the user is typing.
 */

import { useEffect } from 'react';

/**
 * Configuration for {@link useKeyboardShortcut}.
 *
 * @public
 */
export interface UseKeyboardShortcutOptions {
  /** Match Alt/Option. Default false. */
  readonly alt?: boolean;
  /** Disable handling. Default true. */
  readonly enabled?: boolean;
  /** Do not fire while focus is in an input/textarea/select/contentEditable. Default false. */
  readonly ignoreEditableTarget?: boolean;
  /** The key to match, compared case-insensitively against KeyboardEvent.key (e.g. 'e', 'k', 'Escape'). */
  readonly key: string;
  /** Match Cmd on macOS OR Ctrl elsewhere (metaKey || ctrlKey). Default false. */
  readonly meta?: boolean;
  /** Handler invoked on a match. */
  readonly onPress: (event: KeyboardEvent) => void;
  /** Call event.preventDefault() on match. Default true. */
  readonly preventDefault?: boolean;
  /** Match Shift. Default false. */
  readonly shift?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'SELECT' ||
    tag === 'TEXTAREA'
  );
}

/**
 * @public
 * @description Register a window `keydown` shortcut. SSR-safe (no-op until the
 * client `useEffect` runs); returns the cleanup that removes the listener.
 */
export function useKeyboardShortcut(options: UseKeyboardShortcutOptions): void {
  const {
    alt = false,
    enabled = true,
    ignoreEditableTarget = false,
    key,
    meta = false,
    onPress,
    preventDefault = true,
    shift = false,
  } = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (ignoreEditableTarget && isEditableTarget(event.target)) return;

      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (meta !== (event.metaKey || event.ctrlKey)) return;
      if (shift !== event.shiftKey) return;
      if (alt !== event.altKey) return;

      if (preventDefault) event.preventDefault();
      onPress(event);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    alt,
    enabled,
    ignoreEditableTarget,
    key,
    meta,
    onPress,
    preventDefault,
    shift,
  ]);
}
