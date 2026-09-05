import * as React from 'react';

export interface UseTimelineWidthOptions {
  /**
   * Width used before the element is measured, and in any environment that
   * reports none. jsdom implements ResizeObserver as a no-op, so without a
   * sane fallback every rendering test would build a zero-width scale and
   * assert against a chart collapsed to a single column.
   */
  readonly fallbackWidth?: number;
}

export interface UseTimelineWidthResult {
  readonly ref: React.RefObject<HTMLDivElement | null>;
  readonly width: number;
}

const DEFAULT_FALLBACK_WIDTH = 960;

/**
 * Measures the chart body so the time scale can be built in pixels. Returns the
 * fallback until a real measurement arrives, so the first paint is laid out
 * rather than collapsed.
 */
export const useTimelineWidth = (
  options: UseTimelineWidthOptions = {},
): UseTimelineWidthResult => {
  const { fallbackWidth = DEFAULT_FALLBACK_WIDTH } = options;

  // Hooks
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [measured, setMeasured] = React.useState<number | null>(null);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const element = ref.current;
    if (element == null) return;

    if (typeof ResizeObserver === 'undefined') {
      setMeasured(element.getBoundingClientRect().width);

      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;

      setMeasured(entry.contentRect.width);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  // 🔌 Short Circuit

  return {
    ref,
    // A measured zero means the element is hidden (a collapsed panel, a
    // background tab), not that the chart should be zero wide.
    width: measured != null && measured > 0 ? measured : fallbackWidth,
  };
};
