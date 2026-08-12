import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FloorGrid } from '../FloorGrid';

describe('FloorGrid', () => {
  it('renders a floor rect, a pattern-filled grid rect, and a boundary outline sized to width/height', () => {
    const component = render(
      <svg>
        <FloorGrid gridSize={12} height={360} width={480} />
      </svg>,
    );

    const rects = component.container.querySelectorAll('rect');
    // Floor background, pattern-filled grid, boundary outline.
    expect(rects).toHaveLength(3);
    rects.forEach((rect) => {
      expect(rect.getAttribute('width')).toBe('480');
      expect(rect.getAttribute('height')).toBe('360');
    });
  });

  it('sizes the pattern cell to gridSize', () => {
    const component = render(
      <svg>
        <FloorGrid gridSize={24} height={360} width={480} />
      </svg>,
    );

    const pattern = component.container.querySelector('pattern');
    expect(pattern).not.toBeNull();
    expect(pattern?.getAttribute('width')).toBe('24');
    expect(pattern?.getAttribute('height')).toBe('24');
  });

  it('is marked aria-hidden (purely presentational)', () => {
    const component = render(
      <svg>
        <FloorGrid gridSize={12} height={360} width={480} />
      </svg>,
    );

    const group = component.container.querySelector('g');
    expect(group?.getAttribute('aria-hidden')).toBe('true');
  });
});
