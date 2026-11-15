import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { OpenThrottleEntrance } from '../OpenThrottleEntrance';

describe('OpenThrottleEntrance Component', () => {
  test('renders its children', () => {
    const component = render(
      <OpenThrottleEntrance>
        <span>Hero copy</span>
      </OpenThrottleEntrance>,
    );

    expect(component.getByText('Hero copy')).toBeInTheDocument();
  });

  test('applies the provided className to the wrapper', () => {
    const component = render(
      <OpenThrottleEntrance className="custom-entrance">
        <span data-testid="child">Content</span>
      </OpenThrottleEntrance>,
    );

    expect(component.getByTestId('child').parentElement).toHaveClass(
      'custom-entrance',
    );
  });
});
