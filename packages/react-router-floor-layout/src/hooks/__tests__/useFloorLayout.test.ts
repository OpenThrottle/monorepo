import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FloorElementType } from '../../types';
import { createFloorElement } from '../../utils/elements';
import { createEmptyLayout } from '../../utils/layout-operations';
import { useFloorLayout } from '../useFloorLayout';

const initial = createEmptyLayout({ id: 'layout-1' });
const table = createFloorElement({
  center: { x: 24, y: 24 },
  id: 't1',
  type: FloorElementType.TABLE_SQUARE,
});

describe('useFloorLayout', () => {
  it('adds, moves, updates, and removes elements immutably', () => {
    const { result } = renderHook(() => useFloorLayout(initial));

    act(() => result.current.addElement(table));
    expect(result.current.layout.elements).toHaveLength(1);

    act(() => result.current.moveElement('t1', { x: 96, y: 120 }));
    expect(result.current.layout.elements[0]).toMatchObject({ x: 96, y: 120 });

    act(() => result.current.updateElement('t1', { seats: 8 }));
    const updated = result.current.layout.elements[0];
    expect('seats' in updated && updated.seats).toBe(8);

    act(() => result.current.removeElement('t1'));
    expect(result.current.layout.elements).toHaveLength(0);

    // initial was never mutated
    expect(initial.elements).toHaveLength(0);
  });
});
