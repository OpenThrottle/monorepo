import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CalendarView } from '../../types';
import { useCalendar } from '../useCalendar';
import { useSchedule } from '../useSchedule';

function renderUseCalendar(defaultView: CalendarView = CalendarView.Week) {
  return renderHook(() => {
    const schedule = useSchedule({
      events: [],
      views: [CalendarView.Week, CalendarView.Month],
    });
    return useCalendar(schedule, {
      defaultDate: new Date(2026, 5, 15),
      defaultView,
    });
  });
}

describe('useCalendar', () => {
  it('initializes from the provided default view and date', () => {
    const { result } = renderUseCalendar();
    expect(result.current.view).toBe(CalendarView.Week);
    expect(result.current.date.getFullYear()).toBe(2026);
    expect(result.current.date.getMonth()).toBe(5);
    expect(result.current.date.getDate()).toBe(15);
  });

  it('switches the active view', () => {
    const { result } = renderUseCalendar();
    act(() => result.current.setView(CalendarView.Month));
    expect(result.current.view).toBe(CalendarView.Month);
  });

  it('advances and rewinds by one week in week view', () => {
    const { result } = renderUseCalendar(CalendarView.Week);
    act(() => result.current.next());
    expect(result.current.date.getDate()).toBe(22);
    act(() => result.current.prev());
    act(() => result.current.prev());
    expect(result.current.date.getDate()).toBe(8);
  });

  it('advances by one month in month view', () => {
    const { result } = renderUseCalendar(CalendarView.Month);
    act(() => result.current.next());
    expect(result.current.date.getMonth()).toBe(6); // July
    expect(result.current.date.getDate()).toBe(15);
  });

  it('jumps to a specific date and to today', () => {
    const { result } = renderUseCalendar();
    act(() => result.current.setDate(new Date(2027, 0, 1)));
    expect(result.current.date.getFullYear()).toBe(2027);

    act(() => result.current.today());
    expect(result.current.date.getFullYear()).toBe(new Date().getFullYear());
  });
});
