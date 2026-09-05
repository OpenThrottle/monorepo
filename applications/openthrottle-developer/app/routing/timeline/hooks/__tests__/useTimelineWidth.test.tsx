import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useTimelineWidth } from '../useTimelineWidth';

const Probe = (props: {
  readonly fallbackWidth?: number;
}): React.ReactElement => {
  const { ref, width } = useTimelineWidth({
    fallbackWidth: props.fallbackWidth,
  });

  return (
    <div ref={ref}>
      <span data-testid="width">{width}</span>
    </div>
  );
};

describe('useTimelineWidth', () => {
  test('returns the fallback width before anything is measured', () => {
    const view = render(<Probe />);

    expect(view.getByTestId('width')).toHaveTextContent('960');
  });

  test('honours a caller-supplied fallback', () => {
    const view = render(<Probe fallbackWidth={640} />);

    expect(view.getByTestId('width')).toHaveTextContent('640');
  });

  test('never reports zero, so a hidden element cannot collapse the scale', () => {
    // jsdom reports a zero-width bounding box and implements ResizeObserver as
    // a no-op, which is exactly the case the fallback exists for.
    const view = render(<Probe />);

    expect(Number(view.getByTestId('width').textContent)).toBeGreaterThan(0);
  });
});
