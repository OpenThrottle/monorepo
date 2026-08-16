import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { GlobalAnimationMesh } from '../GlobalAnimationMesh';

describe('GlobalAnimationMesh Component', () => {
  const renderMesh = (element: React.ReactElement): RenderResult =>
    render(element);

  test('renders a decorative, non-interactive canvas', () => {
    const component = renderMesh(<GlobalAnimationMesh />);
    const canvas = component.getByTestId('GlobalAnimationMesh');

    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas.className).toContain('pointer-events-none');
  });

  test('mounts without throwing when disabled', () => {
    expect(() =>
      renderMesh(<GlobalAnimationMesh enabled={false} />),
    ).not.toThrow();
  });

  test('accepts tunable overrides', () => {
    expect(() =>
      renderMesh(<GlobalAnimationMesh dotRadius={2} spacing={40} />),
    ).not.toThrow();
  });
});
