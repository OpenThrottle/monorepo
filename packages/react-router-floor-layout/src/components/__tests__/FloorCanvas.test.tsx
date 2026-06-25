import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type UseViewportResult } from '../../hooks/useViewport';
import { FloorElementType, type FloorLayout } from '../../types';
import { type Point } from '../../utils/geometry';
import { createFloorElement } from '../../utils/elements';
import { addElement, createEmptyLayout } from '../../utils/layout-operations';
import { FloorCanvas } from '../FloorCanvas';

function fixture(): FloorLayout {
  // gridSize 12, floor 480 × 360 (createEmptyLayout defaults).
  const table = createFloorElement({
    center: { x: 120, y: 120 },
    id: 't1',
    type: FloorElementType.TABLE_SQUARE,
  });
  return addElement(createEmptyLayout({ id: 'layout-1' }), table);
}

/**
 * A minimal viewport stub with an identity client→world mapping so pointer
 * client coords ARE world inches. Lets us assert FloorCanvas's grab-offset,
 * snap, and clamp math directly without the real viewBox fit.
 */
function stubViewport(): UseViewportResult {
  return {
    clientToWorld: (client: Point) => client,
    fitToScreen: vi.fn(),
    onWheel: vi.fn(),
    panHandlers: {
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
    },
    svgRef: createRef<SVGSVGElement>(),
    viewBox: { height: 360, width: 480, x: 0, y: 0 },
    viewBoxString: '0 0 480 360',
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  };
}

describe('FloorCanvas — element drag commit', () => {
  it('preserves the grab offset and snaps/commits the new center on move', async () => {
    const user = userEvent.setup();
    const drags: Point[] = [];
    const commits: Point[] = [];
    const component = render(
      <FloorCanvas
        layout={fixture()}
        onElementDrag={(_id, center) => drags.push(center)}
        onElementDragEnd={(_id, center) => commits.push(center)}
        viewport={stubViewport()}
      />,
    );
    const element = component.getByRole('img', { name: /table square/i });

    // Grab the element 10in right + 6in below its center (120,120) → grabOffset
    // (-10,-6). Drag the pointer to (200,200); committed center = pointer +
    // offset = (190,194), snapped to the grid of 12 → (192,192).
    await user.pointer([
      { coords: { x: 130, y: 126 }, keys: '[MouseLeft>]', target: element },
      { coords: { x: 200, y: 200 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(drags.length).toBeGreaterThan(0);
    expect(commits).toHaveLength(1);
    expect(commits[0]).toEqual({ x: 192, y: 192 });
  });

  it('clamps the committed center inside the floor bounds', async () => {
    const user = userEvent.setup();
    const commits: Point[] = [];
    const component = render(
      <FloorCanvas
        layout={fixture()}
        onElementDragEnd={(_id, center) => commits.push(center)}
        viewport={stubViewport()}
      />,
    );
    const element = component.getByRole('img', { name: /table square/i });

    // Drag far past the bottom-right corner; clamp keeps the center inside the
    // 480 × 360 floor.
    await user.pointer([
      { coords: { x: 120, y: 120 }, keys: '[MouseLeft>]', target: element },
      { coords: { x: 9000, y: 9000 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(commits[0]).toEqual({ x: 480, y: 360 });
  });

  it('does not commit when the pointer never moved (moved gating)', async () => {
    const user = userEvent.setup();
    const commits: Point[] = [];
    const component = render(
      <FloorCanvas
        layout={fixture()}
        onElementDragEnd={(_id, center) => commits.push(center)}
        viewport={stubViewport()}
      />,
    );
    const element = component.getByRole('img', { name: /table square/i });

    await user.pointer([
      { coords: { x: 120, y: 120 }, keys: '[MouseLeft>]', target: element },
      { keys: '[/MouseLeft]' },
    ]);

    expect(commits).toHaveLength(0);
  });

  it('respects snapEnabled=false (no grid snap on commit)', async () => {
    const user = userEvent.setup();
    const commits: Point[] = [];
    const component = render(
      <FloorCanvas
        layout={fixture()}
        onElementDragEnd={(_id, center) => commits.push(center)}
        snapEnabled={false}
        viewport={stubViewport()}
      />,
    );
    const element = component.getByRole('img', { name: /table square/i });

    // Grab at the exact center → zero offset; drag to (190,194) → committed
    // unchanged (no snap), still inside bounds.
    await user.pointer([
      { coords: { x: 120, y: 120 }, keys: '[MouseLeft>]', target: element },
      { coords: { x: 190, y: 194 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(commits[0]).toEqual({ x: 190, y: 194 });
  });
});
