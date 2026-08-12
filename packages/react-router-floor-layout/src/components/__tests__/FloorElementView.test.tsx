import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type FloorElement, FloorElementType } from '../../types';
import { createFloorElement } from '../../utils/elements';
import { FloorElementView } from '../FloorElementView';

function roundTable(params: {
  readonly id?: string;
  readonly label?: string;
  readonly seats?: number;
}): FloorElement {
  const base = createFloorElement({
    center: { x: 100, y: 100 },
    id: params.id ?? 't1',
    type: FloorElementType.TABLE_ROUND,
  });
  if (base.type !== FloorElementType.TABLE_ROUND) {
    throw new Error(
      'unreachable: createFloorElement returned the requested type',
    );
  }
  return {
    ...base,
    label: params.label,
    seats: params.seats ?? base.seats,
  };
}

function squareTable(id: string): FloorElement {
  return createFloorElement({
    center: { x: 100, y: 100 },
    id,
    type: FloorElementType.TABLE_SQUARE,
  });
}

describe('FloorElementView', () => {
  it('renders an ellipse with an accessible name for round tables', () => {
    const component = render(
      <svg>
        <FloorElementView element={roundTable({})} />
      </svg>,
    );

    const group = component.getByRole('img', { name: /table round/i });
    expect(group.querySelector('ellipse')).not.toBeNull();
    expect(group.querySelector('rect')).toBeNull();
  });

  it('renders a rect for square/rectangle tables, walls, and zones', () => {
    const component = render(
      <svg>
        <FloorElementView element={squareTable('sq1')} />
      </svg>,
    );

    const group = component.getByRole('img', { name: /table square/i });
    expect(group.querySelector('rect')).not.toBeNull();
    expect(group.querySelector('ellipse')).toBeNull();
  });

  it('renders a chair-glyph circle per seat', () => {
    const element = roundTable({ seats: 4 });
    const component = render(
      <svg>
        <FloorElementView element={element} />
      </svg>,
    );

    const group = component.getByRole('img', { name: /table round/i });
    // 4 seat circles.
    expect(group.querySelectorAll('circle')).toHaveLength(4);
  });

  it('renders no seat glyphs for elements without seats', () => {
    const element = createFloorElement({
      center: { x: 0, y: 0 },
      id: 'w1',
      type: FloorElementType.WALL,
    });
    const component = render(
      <svg>
        <FloorElementView element={element} />
      </svg>,
    );

    const group = component.getByRole('img', { name: /wall/i });
    expect(group.querySelectorAll('circle')).toHaveLength(0);
  });

  it('renders the label text when present', () => {
    const element = roundTable({ label: 'VIP' });
    const component = render(
      <svg>
        <FloorElementView element={element} />
      </svg>,
    );

    expect(component.getByText('VIP')).toBeInTheDocument();
  });

  it('renders no label text when absent', () => {
    const element = roundTable({});
    const component = render(
      <svg>
        <FloorElementView element={element} />
      </svg>,
    );

    expect(component.container.querySelector('text')).toBeNull();
  });

  it('applies a thicker stroke width when selected', () => {
    const element = roundTable({});
    const component = render(
      <svg>
        <FloorElementView element={element} isSelected={true} />
      </svg>,
    );

    const shape = component.container.querySelector('ellipse');
    expect(shape?.getAttribute('stroke-width')).toBe('3');
  });

  it('uses the default stroke width when not selected', () => {
    const element = roundTable({});
    const component = render(
      <svg>
        <FloorElementView element={element} />
      </svg>,
    );

    const shape = component.container.querySelector('ellipse');
    expect(shape?.getAttribute('stroke-width')).toBe('2');
  });

  it('invokes onPointerDown when the element receives a pointer-down', async () => {
    const user = userEvent.setup();
    const onPointerDown = vi.fn();
    const component = render(
      <svg>
        <FloorElementView
          element={roundTable({})}
          onPointerDown={onPointerDown}
        />
      </svg>,
    );

    const group = component.getByRole('img', { name: /table round/i });
    await user.pointer({ keys: '[MouseLeft>]', target: group });

    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });
});
