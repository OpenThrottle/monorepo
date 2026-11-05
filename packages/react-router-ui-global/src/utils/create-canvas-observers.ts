/**
 * @description A `ResizeObserver` that calls `onResize`, or `null` where the
 * API is unavailable (SSR, older test environments).
 */
export const createResizeObserver = (
  onResize: () => void,
): ResizeObserver | null => {
  if (typeof ResizeObserver !== 'function') {
    return null;
  }

  return new ResizeObserver(() => {
    onResize();
  });
};

/**
 * @description An `IntersectionObserver` that calls `onVisible` or `onHidden`
 * as the observed element enters or leaves the viewport, or `null` where the
 * API is unavailable.
 */
export const createVisibilityObserver = (
  onVisible: () => void,
  onHidden: () => void,
): IntersectionObserver | null => {
  if (typeof IntersectionObserver !== 'function') {
    return null;
  }

  return new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onVisible();
        } else {
          onHidden();
        }
      }
    },
    { threshold: 0 },
  );
};
