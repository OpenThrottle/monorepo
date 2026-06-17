import { describe, expect, it } from 'vitest';

import { CalendarView } from '../../types';
import {
  fromEngineViewName,
  resolveViews,
  toEngineView,
  toEngineViewName,
} from '../views';

describe('view mapping', () => {
  it('maps neutral views to Schedule-X view names', () => {
    expect(toEngineViewName(CalendarView.Day)).toBe('day');
    expect(toEngineViewName(CalendarView.Week)).toBe('week');
    expect(toEngineViewName(CalendarView.Month)).toBe('month-grid');
  });

  it('maps Schedule-X view names back to neutral views', () => {
    expect(fromEngineViewName('day')).toBe(CalendarView.Day);
    expect(fromEngineViewName('week')).toBe(CalendarView.Week);
    expect(fromEngineViewName('month-grid')).toBe(CalendarView.Month);
  });

  it('falls back to the default view for an unknown engine name', () => {
    expect(fromEngineViewName('list')).toBe(CalendarView.Week);
  });

  it('round-trips a view through name and back', () => {
    for (const view of [
      CalendarView.Day,
      CalendarView.Month,
      CalendarView.Week,
    ]) {
      expect(fromEngineViewName(toEngineViewName(view))).toBe(view);
    }
  });
});

describe('resolveViews', () => {
  it('resolves enabled views to Schedule-X view objects', () => {
    const resolved = resolveViews([CalendarView.Week, CalendarView.Month]);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toBe(toEngineView(CalendarView.Week));
  });

  it('puts the requested default view first without duplicating it', () => {
    const resolved = resolveViews(
      [CalendarView.Week, CalendarView.Month],
      CalendarView.Month,
    );
    expect(resolved[0]).toBe(toEngineView(CalendarView.Month));
    expect(resolved).toHaveLength(2);
  });

  it('always returns a non-empty tuple, even from no views', () => {
    const resolved = resolveViews([]);
    expect(resolved.length).toBeGreaterThanOrEqual(1);
  });
});
