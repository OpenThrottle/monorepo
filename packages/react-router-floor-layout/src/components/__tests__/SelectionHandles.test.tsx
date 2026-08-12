import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type UseViewportResult } from '../../hooks/useViewport';
import { type FloorElement, FloorElementType } from '../../types';
import { type Point } from '../../utils/geometry';
import { createFloorElement } from '../../utils/elements';
import { SelectionHandles } from '../SelectionHandles';

function element(): FloorElement {
  return createFloorElement({
    center: { x: 100, y: 100 },
    id: 'sq1',
    type: FloorElementType.TABLE_SQUARE,
  });
}

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

describe('SelectionHandles', () => {
  it('renders the bounding box, the rotate handle, and the resize handle', () => {
    const component = render(
      <svg>
        <SelectionHandles
          element={element()}
          gridSize={12}
          onTransform={vi.fn()}
          viewport={stubViewport()}
        />
      </svg>,
    );

    expect(
      component.getByRole('button', { name: 'Rotate' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Resize' }),
    ).toBeInTheDocument();
    expect(component.container.querySelectorAll('rect')).toHaveLength(2);
    expect(component.container.querySelector('line')).not.toBeNull();
  });

  it('fires onTransform with move then commit phases while resizing', async () => {
    const user = userEvent.setup();
    const calls: Array<'commit' | 'move'> = [];
    const component = render(
      <svg>
        <SelectionHandles
          element={element()}
          gridSize={12}
          onTransform={(_patch, phase) => calls.push(phase)}
          viewport={stubViewport()}
        />
      </svg>,
    );

    const resizeHandle = component.getByRole('button', { name: 'Resize' });
    await user.pointer([
      {
        coords: { x: 112, y: 112 },
        keys: '[MouseLeft>]',
        target: resizeHandle,
      },
      { coords: { x: 150, y: 150 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(calls).toContain('move');
    expect(calls.at(-1)).toBe('commit');
  });

  it('fires onTransform for rotation drags via the rotate handle', async () => {
    const user = userEvent.setup();
    const calls: Array<'commit' | 'move'> = [];
    const component = render(
      <svg>
        <SelectionHandles
          element={element()}
          gridSize={12}
          onTransform={(_patch, phase) => calls.push(phase)}
          viewport={stubViewport()}
        />
      </svg>,
    );

    const rotateHandle = component.getByRole('button', { name: 'Rotate' });
    await user.pointer([
      { coords: { x: 100, y: 60 }, keys: '[MouseLeft>]', target: rotateHandle },
      { coords: { x: 130, y: 60 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(calls).toContain('move');
    expect(calls.at(-1)).toBe('commit');
  });

  it('sizes handles relative to the viewport width (min 6)', () => {
    const wideViewport = {
      ...stubViewport(),
      viewBox: { height: 360, width: 480, x: 0, y: 0 },
    };
    const component = render(
      <svg>
        <SelectionHandles
          element={element()}
          gridSize={12}
          onTransform={vi.fn()}
          viewport={wideViewport}
        />
      </svg>,
    );

    const resizeHandle = component.getByRole('button', { name: 'Resize' });
    // 480 * 0.014 = 6.72, greater than the 6 floor.
    expect(Number(resizeHandle.getAttribute('width'))).toBeCloseTo(6.72, 1);
  });
});
