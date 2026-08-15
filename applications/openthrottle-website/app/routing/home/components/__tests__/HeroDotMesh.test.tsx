import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { HeroDotMesh } from '../HeroDotMesh';

describe('HeroDotMesh Component', () => {
  const renderMesh = (element: React.ReactElement): RenderResult =>
    render(element);

  test('renders a decorative, non-interactive canvas', () => {
    const component = renderMesh(<HeroDotMesh />);
    const canvas = component.getByTestId('HeroDotMesh');

    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas.className).toContain('pointer-events-none');
  });

  test('mounts without throwing when disabled', () => {
    expect(() => renderMesh(<HeroDotMesh enabled={false} />)).not.toThrow();
  });
});
