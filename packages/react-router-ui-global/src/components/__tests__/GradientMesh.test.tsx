import * as React from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { GradientMesh } from '../GradientMesh';

/**
 * Mock the WebGL shader so the wrapper can be asserted in jsdom (no GL context).
 * The mock records the props it receives so we can verify pass-through.
 */
const meshProps = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock('@paper-design/shaders-react', () => ({
  MeshGradient: (props: Record<string, unknown>) => {
    meshProps.current = props;
    return <div data-testid="mesh-gradient" />;
  },
}));

describe('GradientMesh Component', () => {
  afterEach(() => {
    meshProps.current = {};
    vi.restoreAllMocks();
  });

  test('renders a non-interactive, decorative background layer', () => {
    const { container, getByTestId } = render(<GradientMesh />);

    const layer = container.firstElementChild;
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer).toHaveClass('pointer-events-none', 'absolute', '-z-10');
    expect(getByTestId('mesh-gradient')).toBeInTheDocument();
  });

  test('forwards custom colors and props to the shader', () => {
    render(<GradientMesh colors={['#fff', '#000']} swirl={0.9} />);

    expect(meshProps.current.colors).toEqual(['#fff', '#000']);
    expect(meshProps.current.swirl).toBe(0.9);
  });

  test('zeroes animation speed when the user prefers reduced motion', () => {
    vi.spyOn(globalThis, 'matchMedia').mockImplementation(
      (query: string): MediaQueryList =>
        ({
          addEventListener: () => {},
          addListener: () => {},
          dispatchEvent: () => false,
          matches: true,
          media: query,
          onchange: null,
          removeEventListener: () => {},
          removeListener: () => {},
        }) as MediaQueryList,
    );

    render(<GradientMesh speed={2} />);

    expect(meshProps.current.speed).toBe(0);
  });
});
