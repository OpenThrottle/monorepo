import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { HeroSoundArcs } from '../HeroSoundArcs';

describe('HeroSoundArcs Component', () => {
  const renderArcs = (element: React.ReactElement): RenderResult =>
    render(element);

  test('renders a decorative, non-interactive canvas', () => {
    const component = renderArcs(<HeroSoundArcs />);
    const canvas = component.getByTestId('HeroSoundArcs');

    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas.className).toContain('pointer-events-none');
  });

  test('mounts without throwing when disabled', () => {
    expect(() => renderArcs(<HeroSoundArcs enabled={false} />)).not.toThrow();
  });

  test('accepts stack count and left/right distribution overrides', () => {
    expect(() =>
      renderArcs(
        <HeroSoundArcs distributionEnd={1} distributionStart={0.2} n={8} />,
      ),
    ).not.toThrow();
  });
});
