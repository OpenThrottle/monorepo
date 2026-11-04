const OVERFLOW_SCROLLS = new Set(['auto', 'overlay', 'scroll']);

/** Walks up from `start` to the nearest element whose `overflow-y` scrolls, or null. */
export const findScroller = (start: HTMLElement | null): HTMLElement | null => {
  for (
    let element: HTMLElement | null = start;
    element !== null;
    element = element.parentElement
  ) {
    if (OVERFLOW_SCROLLS.has(getComputedStyle(element).overflowY)) {
      return element;
    }
  }
  return null;
};
