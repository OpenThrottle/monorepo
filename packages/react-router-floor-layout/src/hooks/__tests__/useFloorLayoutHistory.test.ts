import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FloorElementType } from '../../types';
import { createFloorElement } from '../../utils/elements';
import { addElement, createEmptyLayout } from '../../utils/layout-operations';
import { useFloorLayoutHistory } from '../useFloorLayoutHistory';

const initial = createEmptyLayout({ id: 'layout-1' });
const withTable = addElement(
  initial,
  createFloorElement({
    center: { x: 24, y: 24 },
    id: 't1',
    type: FloorElementType.TABLE_SQUARE,
  }),
);

describe('useFloorLayoutHistory', () => {
  it('commits, undoes, and redoes snapshots', () => {
    const { result } = renderHook(() => useFloorLayoutHistory(initial));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => result.current.commit(withTable));
    expect(result.current.layout).toEqual(withTable);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.layout).toEqual(initial);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(result.current.layout).toEqual(withTable);
  });

  it('clears the redo stack on a fresh commit', () => {
    const { result } = renderHook(() => useFloorLayoutHistory(initial));
    act(() => result.current.commit(withTable));
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.commit(withTable));
    expect(result.current.canRedo).toBe(false);
  });

  it('reset replaces the layout and clears history', () => {
    const { result } = renderHook(() => useFloorLayoutHistory(initial));
    act(() => result.current.commit(withTable));
    act(() => result.current.reset(initial));
    expect(result.current.layout).toEqual(initial);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo/redo are no-ops at the ends', () => {
    const { result } = renderHook(() => useFloorLayoutHistory(initial));
    let undone: unknown;
    act(() => {
      undone = result.current.undo();
    });
    expect(undone).toBeNull();
  });
});
