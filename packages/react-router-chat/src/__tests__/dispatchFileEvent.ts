import { act } from '@testing-library/react';

/**
 * Fires a `paste` or `drop` carrying files at an element. jsdom has no
 * ClipboardEvent / DragEvent / DataTransfer, so the payload is attached as the
 * property React reads (`clipboardData` / `dataTransfer`).
 */
export const dispatchFileEvent = (
  element: Element,
  type: 'dragleave' | 'dragover' | 'drop' | 'paste',
  files: readonly File[],
  text = '',
): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const transfer = {
    files,
    getData: () => text,
    types: files.length > 0 || type === 'dragover' ? ['Files'] : [],
  };
  Object.defineProperty(
    event,
    type === 'paste' ? 'clipboardData' : 'dataTransfer',
    {
      value: transfer,
    },
  );
  act(() => {
    element.dispatchEvent(event);
  });

  return event;
};
