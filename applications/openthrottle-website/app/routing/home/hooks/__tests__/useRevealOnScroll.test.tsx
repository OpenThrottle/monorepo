import * as React from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useRevealOnScroll } from '../useRevealOnScroll';

interface MinimalEntry {
  isIntersecting: boolean;
  target: Element;
}

const Harness = (): React.ReactElement => {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <div ref={ref}>
      <p className="landing-reveal" data-testid="target">
        Reveal me
      </p>
    </div>
  );
};

const stubReducedMotion = (matches: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: vi.fn(),
      matches,
      removeEventListener: vi.fn(),
    })),
  );
};

describe('useRevealOnScroll', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('adds the revealed class when the element intersects', () => {
    stubReducedMotion(false);

    class MockObserver {
      private readonly callback: (entries: MinimalEntry[]) => void;
      constructor(callback: (entries: MinimalEntry[]) => void) {
        this.callback = callback;
      }
      disconnect(): void {}
      observe(element: Element): void {
        this.callback([{ isIntersecting: true, target: element }]);
      }
      unobserve(): void {}
    }

    vi.stubGlobal('IntersectionObserver', MockObserver);

    const component = render(<Harness />);

    expect(component.getByTestId('target')).toHaveClass('is-in');
  });

  test('reveals immediately when IntersectionObserver is unavailable', () => {
    stubReducedMotion(false);
    vi.stubGlobal('IntersectionObserver', undefined);

    const component = render(<Harness />);

    expect(component.getByTestId('target')).toHaveClass('is-in');
  });

  test('reveals immediately when reduced motion is preferred', () => {
    stubReducedMotion(true);

    const component = render(<Harness />);

    expect(component.getByTestId('target')).toHaveClass('is-in');
  });
});
