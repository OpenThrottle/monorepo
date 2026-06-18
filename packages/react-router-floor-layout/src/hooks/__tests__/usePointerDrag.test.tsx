import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { type Point } from '../../utils/geometry';
import { type PointerDragContext, usePointerDrag } from '../usePointerDrag';

interface HarnessProps {
  readonly onEnd: (context: PointerDragContext) => void;
  readonly onMove: (context: PointerDragContext) => void;
}

function Harness(props: HarnessProps): ReactElement {
  const drag = usePointerDrag({
    bounds: { height: 100, width: 100, x: 0, y: 0 },
    // Identity world mapping so we can assert on the input coordinates.
    clientToWorld: (client: Point) => client,
    onEnd: props.onEnd,
    onMove: props.onMove,
    snapGrid: 10,
  });
  return (
    <div
      data-testid="surface"
      onPointerDown={drag.start}
      style={{ height: 200, width: 200 }}
    />
  );
}

describe('usePointerDrag', () => {
  it('streams snapped, clamped world coords and commits once on pointerup', async () => {
    const user = userEvent.setup();
    const moves: PointerDragContext[] = [];
    const ends: PointerDragContext[] = [];
    const component = render(
      <Harness onEnd={(c) => ends.push(c)} onMove={(c) => moves.push(c)} />,
    );
    const surface = component.getByTestId('surface');

    await user.pointer([
      { coords: { x: 12, y: 18 }, keys: '[MouseLeft>]', target: surface },
      { coords: { x: 47, y: 52 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(moves.length).toBeGreaterThan(0);
    // (47,52) snapped to a grid of 10 → (50,50); inside the 0..100 bounds.
    expect(moves.at(-1)?.world).toEqual({ x: 50, y: 50 });
    expect(ends).toHaveLength(1);
    expect(ends[0]?.world).toEqual({ x: 50, y: 50 });
    // start (12,18) snapped → (10,20)
    expect(ends[0]?.startWorld).toEqual({ x: 10, y: 20 });
  });

  it('clamps the world point inside the bounds', async () => {
    const user = userEvent.setup();
    const ends: PointerDragContext[] = [];
    const component = render(
      <Harness onEnd={(c) => ends.push(c)} onMove={() => undefined} />,
    );
    const surface = component.getByTestId('surface');

    await user.pointer([
      { coords: { x: 10, y: 10 }, keys: '[MouseLeft>]', target: surface },
      { coords: { x: 180, y: 180 } },
      { keys: '[/MouseLeft]' },
    ]);

    // 180 snaps to 180, then clamps to the 100 max.
    expect(ends[0]?.world).toEqual({ x: 100, y: 100 });
  });
});
