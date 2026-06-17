import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CalendarEvent } from '../../types';
import { useCalendarSelection } from '../useCalendarSelection';

describe('useCalendarSelection', () => {
  it('tracks the clicked time-grid slot and fires the handler', () => {
    const onSelectDateTime = vi.fn<(dateTime: string) => void>();
    const { result } = renderHook(() =>
      useCalendarSelection({ onSelectDateTime }),
    );

    act(() => {
      result.current.callbacks.onClickDateTime?.('2026-06-15T10:00:00.000Z');
    });

    expect(result.current.selection.dateTime).toBe('2026-06-15T10:00:00.000Z');
    expect(onSelectDateTime).toHaveBeenCalledWith('2026-06-15T10:00:00.000Z');
  });

  it('tracks the clicked date and the selected event', () => {
    const event: CalendarEvent = {
      end: '2026-06-15T11:00:00.000Z',
      id: 'evt-x',
      start: '2026-06-15T10:00:00.000Z',
      title: 'Standup',
    };
    const { result } = renderHook(() => useCalendarSelection());

    act(() => {
      result.current.callbacks.onClickDate?.('2026-06-20');
      result.current.callbacks.onEventClick?.(event);
    });

    expect(result.current.selection.date).toBe('2026-06-20');
    expect(result.current.selection.event?.id).toBe('evt-x');
  });

  it('clears the selection', () => {
    const { result } = renderHook(() => useCalendarSelection());

    act(() => {
      result.current.callbacks.onClickDateTime?.('2026-06-15T10:00:00.000Z');
    });
    expect(result.current.selection.dateTime).toBeDefined();

    act(() => {
      result.current.clear();
    });
    expect(result.current.selection).toEqual({});
  });

  it('keeps a stable callbacks identity across re-renders', () => {
    const { result, rerender } = renderHook(() => useCalendarSelection());
    const first = result.current.callbacks;
    rerender();
    expect(result.current.callbacks).toBe(first);
  });
});
