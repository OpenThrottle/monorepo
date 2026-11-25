import { describe, expect, it } from 'vitest';

import { CALENDAR_VIEW } from '../../types';
import {
  fromEngineViewName,
  resolveViews,
  toEngineView,
  toEngineViewName,
} from '../views';

describe('view mapping', () => {
  it('maps neutral views to Schedule-X view names', () => {
    expect(toEngineViewName(CALENDAR_VIEW.Day)).toBe('day');
    expect(toEngineViewName(CALENDAR_VIEW.Week)).toBe('week');
    expect(toEngineViewName(CALENDAR_VIEW.Month)).toBe('month-grid');
  });

  it('maps Schedule-X view names back to neutral views', () => {
    expect(fromEngineViewName('day')).toBe(CALENDAR_VIEW.Day);
    expect(fromEngineViewName('week')).toBe(CALENDAR_VIEW.Week);
    expect(fromEngineViewName('month-grid')).toBe(CALENDAR_VIEW.Month);
  });

  it('falls back to the default view for an unknown engine name', () => {
    expect(fromEngineViewName('list')).toBe(CALENDAR_VIEW.Week);
  });

  it('round-trips a view through name and back', () => {
    for (const view of [
      CALENDAR_VIEW.Day,
      CALENDAR_VIEW.Month,
      CALENDAR_VIEW.Week,
    ]) {
      expect(fromEngineViewName(toEngineViewName(view))).toBe(view);
    }
  });
});

describe('resolveViews', () => {
  it('resolves enabled views to Schedule-X view objects', () => {
    const resolved = resolveViews([CALENDAR_VIEW.Week, CALENDAR_VIEW.Month]);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toBe(toEngineView(CALENDAR_VIEW.Week));
  });

  it('puts the requested default view first without duplicating it', () => {
    const resolved = resolveViews(
      [CALENDAR_VIEW.Week, CALENDAR_VIEW.Month],
      CALENDAR_VIEW.Month,
    );
    expect(resolved[0]).toBe(toEngineView(CALENDAR_VIEW.Month));
    expect(resolved).toHaveLength(2);
  });

  it('always returns a non-empty tuple, even from no views', () => {
    const resolved = resolveViews([]);
    expect(resolved.length).toBeGreaterThanOrEqual(1);
  });
});
