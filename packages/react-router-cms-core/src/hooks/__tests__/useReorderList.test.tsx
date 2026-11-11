import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import type { CmsReorderListSource } from '../../types/cms-reorder-list';
import { useReorderList } from '../useReorderList';

describe('useReorderList', () => {
  describe('when uncontrolled', () => {
    test('starts from the default items', () => {
      const { result } = renderHook(() =>
        useReorderList({
          source: {
            defaultItems: ['a', 'b', 'c'],
            kind: 'uncontrolled',
            onReorder: undefined,
          },
        }),
      );

      expect(result.current.items).toEqual(['a', 'b', 'c']);
    });

    test('reorders its own state and reports the new order', () => {
      const onReorder = vi.fn();
      const { result } = renderHook(() =>
        useReorderList({
          source: {
            defaultItems: ['a', 'b', 'c'],
            kind: 'uncontrolled',
            onReorder,
          },
        }),
      );

      act(() => {
        result.current.moveItem(0, 2);
      });

      expect(result.current.items).toEqual(['b', 'c', 'a']);
      expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a']);
    });

    test('ignores a move that changes nothing', () => {
      const onReorder = vi.fn();
      const { result } = renderHook(() =>
        useReorderList({
          source: { defaultItems: ['a', 'b'], kind: 'uncontrolled', onReorder },
        }),
      );

      act(() => {
        result.current.moveItem(1, 1);
      });

      expect(onReorder).not.toHaveBeenCalled();
    });
  });

  describe('when controlled', () => {
    test('reports the new order and leaves the items to the caller', () => {
      const onReorder = vi.fn();
      const items = ['a', 'b', 'c'];
      const { result } = renderHook(() =>
        useReorderList({ source: { items, kind: 'controlled', onReorder } }),
      );

      act(() => {
        result.current.moveItem(2, 0);
      });

      expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b']);
      expect(result.current.items).toBe(items);
    });

    test('follows new items from the caller', () => {
      const { rerender, result } = renderHook(
        (props: { readonly source: CmsReorderListSource<string> }) =>
          useReorderList({ source: props.source }),
        {
          initialProps: {
            source: {
              items: ['a', 'b'],
              kind: 'controlled',
              onReorder: vi.fn(),
            },
          },
        },
      );

      rerender({
        source: { items: ['b', 'a'], kind: 'controlled', onReorder: vi.fn() },
      });

      expect(result.current.items).toEqual(['b', 'a']);
    });
  });
});
