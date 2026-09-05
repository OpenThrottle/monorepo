import * as React from 'react';

export interface UseTimelinePanOptions {
  /** Pixels moved per arrow-key press. */
  readonly keyStep?: number;
}

export interface UseTimelinePanResult {
  readonly isPanning: boolean;
  readonly onKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
  readonly onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  readonly onPointerMove: React.PointerEventHandler<HTMLDivElement>;
  readonly onPointerUp: React.PointerEventHandler<HTMLDivElement>;
  readonly ref: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_KEY_STEP = 80;

/**
 * Drag-to-pan and arrow-key panning over a horizontally scrolling chart body.
 *
 * Panning is scroll, not a transform: the container keeps native overflow, so
 * shift-scroll, trackpad gestures and the scrollbar all keep working for free,
 * and the chart never traps the page's own scroll. Keyboard panning is what
 * makes the chart reachable without a pointer at all.
 */
export const useTimelinePan = (
  options: UseTimelinePanOptions = {},
): UseTimelinePanResult => {
  const { keyStep = DEFAULT_KEY_STEP } = options;

  // Hooks
  const ref = React.useRef<HTMLDivElement | null>(null);
  const origin = React.useRef<{ scrollLeft: number; x: number } | null>(null);
  const [isPanning, setIsPanning] = React.useState(false);

  // Setup

  // Handlers
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    // Primary button only — a right-click or a middle-click drag is somebody
    // else's gesture, and hijacking it breaks context menus.
    if (event.button !== 0) return;

    const element = ref.current;
    if (element == null) return;

    origin.current = { scrollLeft: element.scrollLeft, x: event.clientX };
    setIsPanning(true);
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const element = ref.current;
    const start = origin.current;
    if (element == null || start == null) return;

    element.scrollLeft = start.scrollLeft - (event.clientX - start.x);
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
    origin.current = null;
    setIsPanning(false);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    const element = ref.current;
    if (element == null) return;

    if (event.key === 'ArrowLeft') {
      element.scrollLeft -= keyStep;
      event.preventDefault();

      return;
    }

    if (event.key === 'ArrowRight') {
      element.scrollLeft += keyStep;
      event.preventDefault();

      return;
    }

    if (event.key === 'Home') {
      element.scrollLeft = 0;
      event.preventDefault();

      return;
    }

    if (event.key === 'End') {
      element.scrollLeft = element.scrollWidth;
      event.preventDefault();
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    isPanning,
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    ref,
  };
};
