import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { describe, expect, test, vi } from 'vitest';

import { useReorderItem } from '../useReorderItem';

const wrapper = (props: { readonly children: React.ReactNode }) => {
  return <DndProvider backend={HTML5Backend}>{props.children}</DndProvider>;
};

describe('useReorderItem', () => {
  test('is idle before any drag starts', () => {
    const { result } = renderHook(
      () => useReorderItem({ id: 'a', index: 0, onMove: vi.fn() }),
      { wrapper },
    );

    expect(result.current.isDragging).toBe(false);
    expect(result.current.handlerId).toEqual(expect.any(String));
  });

  test('returns separate row and handle refs', () => {
    const { result } = renderHook(
      () => useReorderItem({ id: 'a', index: 0, onMove: vi.fn() }),
      { wrapper },
    );

    expect(result.current.rowRef).toBeTypeOf('function');
    expect(result.current.handleRef).toBeTypeOf('function');
    expect(result.current.rowRef).not.toBe(result.current.handleRef);
  });
});
