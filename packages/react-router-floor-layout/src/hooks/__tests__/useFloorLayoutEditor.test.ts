import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FloorElementType, type FloorLayout } from '../../types';
import { createFloorElement } from '../../utils/elements';
import { addElement, createEmptyLayout } from '../../utils/layout-operations';
import { useFloorLayoutEditor } from '../useFloorLayoutEditor';

function firstElementId(layout: FloorLayout): string {
  const first = layout.elements[0];
  if (!first) throw new Error('expected at least one element');
  return first.id;
}

describe('useFloorLayoutEditor', () => {
  it('starts with an empty layout and no selection when uncontrolled', () => {
    const { result } = renderHook(() => useFloorLayoutEditor({}));

    expect(result.current.layout.elements).toHaveLength(0);
    expect(result.current.selected).toBeNull();
    expect(result.current.selectedId).toBeNull();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.snapEnabled).toBe(true);
  });

  it('creates and selects a new element on handleCreateCommit, emitting onChange once', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useFloorLayoutEditor({ onChange }));

    act(() => {
      result.current.handleCreateCommit(FloorElementType.TABLE_SQUARE, {
        x: 100,
        y: 100,
      });
    });

    expect(result.current.layout.elements).toHaveLength(1);
    expect(result.current.selectedId).toBe(
      result.current.layout.elements[0]?.id,
    );
    expect(result.current.selected?.type).toBe(FloorElementType.TABLE_SQUARE);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(true);
  });

  it('handleElementDrag updates a live overlay without committing (no onChange)', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useFloorLayoutEditor({ onChange }));

    act(() => {
      result.current.handleCreateCommit(FloorElementType.TABLE_SQUARE, {
        x: 100,
        y: 100,
      });
    });
    onChange.mockClear();
    const id = firstElementId(result.current.layout);

    act(() => {
      result.current.handleElementDrag(id, { x: 200, y: 200 });
    });

    expect(result.current.layout.elements[0]).toMatchObject({
      x: 200,
      y: 200,
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('handleElementDragEnd commits the move exactly once', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useFloorLayoutEditor({ onChange }));

    act(() => {
      result.current.handleCreateCommit(FloorElementType.TABLE_SQUARE, {
        x: 100,
        y: 100,
      });
    });
    onChange.mockClear();
    const id = firstElementId(result.current.layout);

    act(() => {
      result.current.handleElementDrag(id, { x: 150, y: 150 });
      result.current.handleElementDragEnd(id, { x: 200, y: 200 });
    });

    expect(result.current.layout.elements[0]).toMatchObject({
      x: 200,
      y: 200,
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('select() fires onSelectionChange only when the id changes', () => {
    const onSelectionChange = vi.fn();
    const { result } = renderHook(() =>
      useFloorLayoutEditor({ onSelectionChange }),
    );

    act(() => result.current.select('a'));
    expect(onSelectionChange).toHaveBeenCalledWith('a');

    onSelectionChange.mockClear();
    act(() => result.current.select('a'));
    expect(onSelectionChange).not.toHaveBeenCalled();

    act(() => result.current.select(null));
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

  it('handleDelete removes the selected element and clears the selection', () => {
    const { result } = renderHook(() => useFloorLayoutEditor({}));

    act(() => {
      result.current.handleCreateCommit(FloorElementType.STOOL, {
        x: 50,
        y: 50,
      });
    });
    expect(result.current.layout.elements).toHaveLength(1);

    act(() => result.current.handleDelete());

    expect(result.current.layout.elements).toHaveLength(0);
    expect(result.current.selectedId).toBeNull();
  });

  it('handleDelete is a no-op when nothing is selected', () => {
    const { result } = renderHook(() => useFloorLayoutEditor({}));

    act(() => result.current.handleDelete());

    expect(result.current.layout.elements).toHaveLength(0);
  });

  it('handlePanelChange applies an edit patch to the selected element', () => {
    const { result } = renderHook(() => useFloorLayoutEditor({}));

    act(() => {
      result.current.handleCreateCommit(FloorElementType.ZONE, {
        x: 50,
        y: 50,
      });
    });

    act(() => result.current.handlePanelChange({ label: 'Patio' }));

    expect(result.current.selected?.label).toBe('Patio');
  });

  it('handleTransform applies a live patch on move and commits on commit', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useFloorLayoutEditor({ onChange }));

    act(() => {
      result.current.handleCreateCommit(FloorElementType.TABLE_SQUARE, {
        x: 100,
        y: 100,
      });
    });
    onChange.mockClear();

    act(() => result.current.handleTransform({ width: 60 }, 'move'));
    expect(result.current.selected?.width).toBe(60);
    expect(onChange).not.toHaveBeenCalled();

    act(() => result.current.handleTransform({ width: 72 }, 'commit'));
    expect(result.current.selected?.width).toBe(72);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('handleToggleSnap flips snapEnabled', () => {
    const { result } = renderHook(() => useFloorLayoutEditor({}));

    expect(result.current.snapEnabled).toBe(true);
    act(() => result.current.handleToggleSnap());
    expect(result.current.snapEnabled).toBe(false);
    act(() => result.current.handleToggleSnap());
    expect(result.current.snapEnabled).toBe(true);
  });

  it('handleUndo/handleRedo restore prior committed layouts and emit onChange', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useFloorLayoutEditor({ onChange }));

    act(() => {
      result.current.handleCreateCommit(FloorElementType.TABLE_SQUARE, {
        x: 10,
        y: 10,
      });
    });
    expect(result.current.layout.elements).toHaveLength(1);
    onChange.mockClear();

    act(() => result.current.handleUndo());
    expect(result.current.layout.elements).toHaveLength(0);
    expect(onChange).toHaveBeenCalledTimes(1);

    onChange.mockClear();
    act(() => result.current.handleRedo());
    expect(result.current.layout.elements).toHaveLength(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('handleCreatePreview sets and clears the ghost preview element', () => {
    const { result } = renderHook(() => useFloorLayoutEditor({}));

    act(() =>
      result.current.handleCreatePreview(FloorElementType.WALL, {
        x: 20,
        y: 20,
      }),
    );
    expect(result.current.preview?.type).toBe(FloorElementType.WALL);

    act(() => result.current.handleCreatePreview(null, null));
    expect(result.current.preview).toBeNull();
  });

  it('honors a controlled value and re-syncs when the value identity changes', () => {
    const controlled: FloorLayout = createEmptyLayout({ id: 'ctrl-1' });
    const { rerender, result } = renderHook(
      (props: { value: FloorLayout }) => useFloorLayoutEditor(props),
      { initialProps: { value: controlled } },
    );

    expect(result.current.layout.elements).toHaveLength(0);

    const withElement = addElement(
      controlled,
      createFloorElement({
        center: { x: 10, y: 10 },
        id: 'e1',
        type: FloorElementType.STOOL,
      }),
    );

    rerender({ value: withElement });

    expect(result.current.layout.elements).toHaveLength(1);
  });

  it('bounds reflect the current layout dimensions', () => {
    const { result } = renderHook(() => useFloorLayoutEditor({}));

    expect(result.current.bounds).toEqual({
      height: 360,
      width: 480,
      x: 0,
      y: 0,
    });
  });
});
