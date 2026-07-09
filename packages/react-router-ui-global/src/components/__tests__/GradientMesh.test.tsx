import * as React from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { GradientMesh } from '../GradientMesh';

/**
 * Present a structural test double as its real type. The public overload hands
 * the caller `T`; the implementation stays `unknown`-typed, so the mock
 * boundary needs no `as` cast. `MediaQueryList` is a wide DOM interface we only
 * partially implement here.
 */
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

/**
 * Mock the WebGL shader so the wrapper can be asserted in jsdom (no GL context).
 * The mock records the props it receives so we can verify pass-through.
 */
const meshProps = vi.hoisted((): { current: Record<string, unknown> } => ({
  current: {},
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
    vi.spyOn(globalThis, 'matchMedia').mockImplementation((query: string) =>
      asMock<MediaQueryList>({
        addEventListener: () => {},
        addListener: () => {},
        dispatchEvent: () => false,
        matches: true,
        media: query,
        onchange: null,
        removeEventListener: () => {},
        removeListener: () => {},
      }),
    );

    render(<GradientMesh speed={2} />);

    expect(meshProps.current.speed).toBe(0);
  });
});
