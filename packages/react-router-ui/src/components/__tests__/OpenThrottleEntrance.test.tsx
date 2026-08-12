import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { OpenThrottleEntrance } from '../OpenThrottleEntrance';

describe('OpenThrottleEntrance Component', () => {
  test('renders its children', () => {
    render(
      <OpenThrottleEntrance>
        <span>Hero copy</span>
      </OpenThrottleEntrance>,
    );

    expect(screen.getByText('Hero copy')).toBeInTheDocument();
  });

  test('applies the provided className to the wrapper', () => {
    render(
      <OpenThrottleEntrance className="custom-entrance">
        <span data-testid="child">Content</span>
      </OpenThrottleEntrance>,
    );

    expect(screen.getByTestId('child').parentElement).toHaveClass(
      'custom-entrance',
    );
  });
});
