import { describe, expect, it, vi } from 'vitest';

import type { CalendarEvent } from '../../types';
import { toEngineCallbacks } from '../callbacks';
import { toPlainDate, toZonedDateTime } from '../datetime';
import { toEngineEvent } from '../events';

describe('toEngineCallbacks', () => {
  it('returns undefined when no callbacks (or only empty) are provided', () => {
    expect(toEngineCallbacks(undefined)).toBeUndefined();
    expect(toEngineCallbacks({})).toBeUndefined();
  });

  it('adapts the time-grid datetime to an ISO string', () => {
    const onClickDateTime = vi.fn<(dateTime: string) => void>();
    const engine = toEngineCallbacks({ onClickDateTime });

    engine?.onClickDateTime?.(toZonedDateTime('2026-06-15T10:00:00.000Z'));

    expect(onClickDateTime).toHaveBeenCalledOnce();
    const [arg] = onClickDateTime.mock.calls[0] ?? [];
    expect(new Date(arg ?? '').getTime()).toBe(
      new Date('2026-06-15T10:00:00.000Z').getTime(),
    );
  });

  it('adapts the month-grid date to a YYYY-MM-DD string', () => {
    const onClickDate = vi.fn<(date: string) => void>();
    const engine = toEngineCallbacks({ onClickDate });

    engine?.onClickDate?.(toPlainDate('2026-06-15'));

    expect(onClickDate).toHaveBeenCalledWith('2026-06-15');
  });

  it('adapts the clicked engine event to a domain CalendarEvent', () => {
    const onEventClick = vi.fn<(event: CalendarEvent) => void>();
    const engine = toEngineCallbacks({ onEventClick });
    const uiEvent = new UIEvent('click');

    engine?.onEventClick?.(
      toEngineEvent({
        end: '2026-06-15T11:00:00.000Z',
        id: 'evt-x',
        start: '2026-06-15T10:00:00.000Z',
        title: 'Standup',
      }),
      uiEvent,
    );

    expect(onEventClick).toHaveBeenCalledOnce();
    const [event] = onEventClick.mock.calls[0] ?? [];
    expect(event?.id).toBe('evt-x');
    expect(event?.title).toBe('Standup');
  });
});
