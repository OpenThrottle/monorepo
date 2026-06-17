import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CalendarEvent } from '../../types';
import { CalendarView } from '../../types';
import { useSchedule } from '../useSchedule';

const event = (id: string, title: string): CalendarEvent => ({
  end: '2026-06-15T18:30:00.000Z',
  id,
  start: '2026-06-15T17:30:00.000Z',
  title,
});

describe('useSchedule', () => {
  it('creates an instance and exposes the initial events (standalone, no view rendered)', () => {
    const { result } = renderHook(() =>
      useSchedule({
        events: [event('a', 'Alpha')],
        views: [CalendarView.Week],
      }),
    );

    expect(result.current.instance).toBeDefined();
    expect(result.current.plugins.eventsService).toBeDefined();
    expect(result.current.all()).toHaveLength(1);
    expect(result.current.getById('a')?.title).toBe('Alpha');
  });

  it('adds, updates, and removes events through the CalendarEvent adapter', () => {
    const { result } = renderHook(() =>
      useSchedule({ events: [event('a', 'Alpha')] }),
    );

    result.current.add(event('b', 'Beta'));
    expect(result.current.all()).toHaveLength(2);

    result.current.update({ ...event('b', 'Beta renamed') });
    expect(result.current.getById('b')?.title).toBe('Beta renamed');

    result.current.remove('a');
    expect(result.current.all()).toHaveLength(1);
    expect(result.current.getById('a')).toBeUndefined();
  });

  it('replaces all events with set()', () => {
    const { result } = renderHook(() =>
      useSchedule({ events: [event('a', 'Alpha')] }),
    );

    result.current.set([event('x', 'X'), event('y', 'Y')]);
    expect(
      result.current
        .all()
        .map((e) => e.id)
        .sort(),
    ).toEqual(['x', 'y']);
  });

  it('wires the full interaction plugin set by default (drag-and-drop + resize)', () => {
    const { result } = renderHook(() => useSchedule({ events: [] }));
    // events-service + calendar-controls + drag-and-drop + resize + current-time
    // + event-recurrence + event-modal
    expect(result.current.plugins.list).toHaveLength(7);
    expect(result.current.plugins.calendarControls).toBeDefined();
  });

  it('keeps the same instance across re-renders', () => {
    const { result, rerender } = renderHook(() => useSchedule({ events: [] }));
    const first = result.current.instance;
    rerender();
    expect(result.current.instance).toBe(first);
  });
});
