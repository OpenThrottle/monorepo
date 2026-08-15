import * as React from 'react';

/**
 * Reveal-on-scroll for the landing page — the CSP-safe React equivalent of the
 * source mockup's inline IntersectionObserver `<script>`.
 *
 * Attach the returned ref to a container; every descendant carrying the
 * `.landing-reveal` class fades/rises in the first time it enters the viewport,
 * then is unobserved. SSR-safe (effect only runs client-side) and degrades
 * gracefully: when `prefers-reduced-motion: reduce` is set or
 * `IntersectionObserver` is unavailable, elements are revealed immediately.
 */
const REVEAL_SELECTOR = '.landing-reveal';
const REVEALED_CLASS = 'is-in';

export const useRevealOnScroll = <
  T extends HTMLElement = HTMLElement,
>(): React.RefObject<T | null> => {
  const containerRef = React.useRef<T>(null);

  React.useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const targets = Array.from(
      container.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
    );

    const revealAll = (): void => {
      for (const target of targets) {
        target.classList.add(REVEALED_CLASS);
      }
    };

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      revealAll();

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(REVEALED_CLASS);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );

    for (const target of targets) {
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return containerRef;
};
