import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { useKeyboardShortcut } from '../useKeyboardShortcut';

const dispatchKeyDown = (
  init: KeyboardEventInit,
  target: EventTarget = window,
): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};

describe('useKeyboardShortcut', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('fires onPress on meta+key match via metaKey and via ctrlKey', () => {
    const onPress = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: 'e', meta: true, onPress }));

    dispatchKeyDown({ key: 'e', metaKey: true });
    dispatchKeyDown({ ctrlKey: true, key: 'E' });

    expect(onPress).toHaveBeenCalledTimes(2);
  });

  test('does not fire on the bare key without the required modifier', () => {
    const onPress = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: 'e', meta: true, onPress }));

    dispatchKeyDown({ key: 'e' });

    expect(onPress).not.toHaveBeenCalled();
  });

  test('does not fire when enabled is false', () => {
    const onPress = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({ enabled: false, key: 'e', meta: true, onPress }),
    );

    dispatchKeyDown({ key: 'e', metaKey: true });

    expect(onPress).not.toHaveBeenCalled();
  });

  test('ignoreEditableTarget suppresses the handler on editable targets', () => {
    const onPress = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({
        ignoreEditableTarget: true,
        key: 'e',
        meta: true,
        onPress,
      }),
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    dispatchKeyDown({ key: 'e', metaKey: true }, input);

    expect(onPress).not.toHaveBeenCalled();
  });

  test('default (ignoreEditableTarget false) still fires on editable targets', () => {
    const onPress = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: 'e', meta: true, onPress }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    dispatchKeyDown({ key: 'e', metaKey: true }, input);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('calls preventDefault by default and not when preventDefault is false', () => {
    const onPress = vi.fn();
    const { rerender } = renderHook(
      (props: { readonly preventDefault: boolean }) =>
        useKeyboardShortcut({
          key: 'e',
          meta: true,
          onPress,
          preventDefault: props.preventDefault,
        }),
      { initialProps: { preventDefault: true } },
    );

    const defaulted = dispatchKeyDown({ key: 'e', metaKey: true });
    expect(defaulted.defaultPrevented).toBe(true);

    rerender({ preventDefault: false });
    const notPrevented = dispatchKeyDown({ key: 'e', metaKey: true });
    expect(notPrevented.defaultPrevented).toBe(false);
  });

  test('removes the listener on unmount', () => {
    const onPress = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcut({ key: 'e', meta: true, onPress }),
    );

    unmount();
    dispatchKeyDown({ key: 'e', metaKey: true });

    expect(onPress).not.toHaveBeenCalled();
  });
});
