import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import type { CommanderItem } from '../../components/OpenThrottleCommander';
import { useOpenThrottleCommander } from '../useOpenThrottleCommander';

describe('useOpenThrottleCommander', () => {
  test('is closed by default and opens uncontrolled', () => {
    const { result } = renderHook(() => useOpenThrottleCommander({}));

    expect(result.current.open).toBe(false);

    act(() => {
      result.current.setOpen(true);
    });

    expect(result.current.open).toBe(true);
  });

  test('honors defaultOpen', () => {
    const { result } = renderHook(() =>
      useOpenThrottleCommander({ defaultOpen: true }),
    );

    expect(result.current.open).toBe(true);
  });

  test('clears search when the dialog opens', () => {
    const { result, rerender } = renderHook(
      (props: { open: boolean }) =>
        useOpenThrottleCommander({
          onOpenChange: () => undefined,
          open: props.open,
        }),
      { initialProps: { open: false } },
    );

    act(() => {
      result.current.setSearch('hello');
    });
    expect(result.current.search).toBe('hello');

    rerender({ open: true });

    expect(result.current.search).toBe('');
  });

  test('is controlled when both open and onOpenChange are provided', () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useOpenThrottleCommander({ onOpenChange, open: false }),
    );

    act(() => {
      result.current.setOpen(true);
    });

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(result.current.open).toBe(false);
  });

  test('handleSelect calls the item onSelect and closes the dialog', () => {
    const onSelect = vi.fn();
    const item: CommanderItem = { id: 'item-1', label: 'Item 1', onSelect };
    const { result } = renderHook(() =>
      useOpenThrottleCommander({ defaultOpen: true }),
    );

    act(() => {
      result.current.handleSelect(item);
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(result.current.open).toBe(false);
  });

  test('handleSelect tolerates items without onSelect', () => {
    const item: CommanderItem = { id: 'item-1', label: 'Item 1' };
    const { result } = renderHook(() =>
      useOpenThrottleCommander({ defaultOpen: true }),
    );

    expect(() => {
      act(() => {
        result.current.handleSelect(item);
      });
    }).not.toThrow();
    expect(result.current.open).toBe(false);
  });

  test('trims search and reports empty-state escape hatch when onEmptyStateSearch is set', () => {
    const onEmptyStateSearch = vi.fn();
    const { result } = renderHook(() =>
      useOpenThrottleCommander({ onEmptyStateSearch }),
    );

    act(() => {
      result.current.setSearch('  plan-123  ');
    });

    expect(result.current.trimmedSearch).toBe('plan-123');
    expect(result.current.showEmptyEscapeHatch).toBe(true);
  });

  test('handleEmptyStateSearch invokes the callback with the trimmed value and closes', () => {
    const onEmptyStateSearch = vi.fn();
    const { result } = renderHook(() =>
      useOpenThrottleCommander({ defaultOpen: true, onEmptyStateSearch }),
    );

    act(() => {
      result.current.setSearch('  plan-123  ');
    });

    act(() => {
      result.current.handleEmptyStateSearch();
    });

    expect(onEmptyStateSearch).toHaveBeenCalledWith('plan-123');
    expect(result.current.open).toBe(false);
  });

  test('handleEmptyStateSearch is a no-op when search is blank', () => {
    const onEmptyStateSearch = vi.fn();
    const { result } = renderHook(() =>
      useOpenThrottleCommander({ defaultOpen: true, onEmptyStateSearch }),
    );

    act(() => {
      result.current.handleEmptyStateSearch();
    });

    expect(onEmptyStateSearch).not.toHaveBeenCalled();
    expect(result.current.open).toBe(true);
  });

  test('surfaces emptyStateExtras for non-empty search and none when search is empty', () => {
    const extraItem: CommanderItem = { id: 'uuid-1', label: 'Found plan' };
    const emptyStateExtras = vi.fn(() => [extraItem]);
    const { result } = renderHook(() =>
      useOpenThrottleCommander({ emptyStateExtras }),
    );

    expect(result.current.extraItems).toEqual([]);

    act(() => {
      result.current.setSearch('uuid-1');
    });

    expect(emptyStateExtras).toHaveBeenCalledWith('uuid-1');
    expect(result.current.extraItems).toEqual([extraItem]);
    expect(result.current.showEmptyEscapeHatch).toBe(true);
  });
});
