import { describe, expect, it } from 'vitest';

import type { CalendarEvent } from '../../types';
// Use the ambient global `Temporal` (installed via `../datetime` ->
// `temporal-polyfill/global`) rather than the module export, matching the
// source-mandated global form; the two class identities are non-assignable.
import { temporalToISOString, toZonedDateTime } from '../datetime';
import { fromEngineEvent, toEngineEvent } from '../events';

describe('toEngineEvent', () => {
  it('maps a timed event to ZonedDateTime start/end and copies fields', () => {
    const event: CalendarEvent = {
      calendarId: 'work',
      description: 'Quarterly review',
      end: '2026-06-15T18:30:00.000Z',
      id: 'evt-1',
      location: 'Room 4',
      people: ['ana', 'ben'],
      start: '2026-06-15T17:30:00.000Z',
      title: 'Planning',
    };

    const engine = toEngineEvent(event);

    expect(engine.start).toBeInstanceOf(Temporal.ZonedDateTime);
    expect(engine.end).toBeInstanceOf(Temporal.ZonedDateTime);
    expect(engine.id).toBe('evt-1');
    expect(engine.title).toBe('Planning');
    expect(engine.calendarId).toBe('work');
    expect(engine.description).toBe('Quarterly review');
    expect(engine.location).toBe('Room 4');
    expect(engine.people).toEqual(['ana', 'ben']);
  });

  it('maps an all-day event to PlainDate start/end', () => {
    const engine = toEngineEvent({
      allDay: true,
      end: '2026-06-16',
      id: 'evt-2',
      start: '2026-06-15',
      title: 'Conference',
    });

    expect(engine.start).toBeInstanceOf(Temporal.PlainDate);
    expect(engine.end).toBeInstanceOf(Temporal.PlainDate);
    expect(temporalToISOString(engine.start)).toBe('2026-06-15');
  });

  it('omits optional fields that are absent', () => {
    const engine = toEngineEvent({
      end: '2026-06-15T18:30:00.000Z',
      id: 'evt-3',
      start: '2026-06-15T17:30:00.000Z',
      title: 'Solo',
    });

    expect('calendarId' in engine).toBe(false);
    expect('location' in engine).toBe(false);
    expect('people' in engine).toBe(false);
    expect('rrule' in engine).toBe(false);
    expect('exdate' in engine).toBe(false);
  });

  it('writes the raw rrule string and normalizes exdate to ISO strings', () => {
    const engine = toEngineEvent({
      end: '2026-06-15T18:30:00.000Z',
      exdate: ['2026-06-22T17:30:00.000Z'],
      id: 'evt-4',
      rrule: { rule: 'FREQ=WEEKLY;BYDAY=MO' },
      start: '2026-06-15T17:30:00.000Z',
      title: 'Standup',
    });

    expect(engine.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
    expect(Array.isArray(engine.exdate)).toBe(true);
    expect(typeof engine.exdate[0]).toBe('string');
    expect(new Date(engine.exdate[0]).getTime()).toBe(
      new Date('2026-06-22T17:30:00.000Z').getTime(),
    );
  });
});

describe('fromEngineEvent', () => {
  it('normalizes a numeric engine id to a string', () => {
    const domain = fromEngineEvent({
      end: toZonedDateTime('2026-06-15T18:30:00.000Z'),
      id: 42,
      start: toZonedDateTime('2026-06-15T17:30:00.000Z'),
    });

    expect(domain.id).toBe('42');
    expect(domain.title).toBe('');
    expect(domain.allDay).toBeUndefined();
  });
});

describe('round-trips', () => {
  it('preserves a timed event through domain -> engine -> domain (by instant)', () => {
    const original: CalendarEvent = {
      calendarId: 'work',
      end: '2026-06-15T18:30:00.000Z',
      id: 'evt-1',
      people: ['ana'],
      start: '2026-06-15T17:30:00.000Z',
      title: 'Planning',
    };

    const result = fromEngineEvent(toEngineEvent(original));

    expect(new Date(result.start).getTime()).toBe(
      new Date(original.start).getTime(),
    );
    expect(new Date(result.end).getTime()).toBe(
      new Date(original.end).getTime(),
    );
    expect(result.id).toBe(original.id);
    expect(result.title).toBe(original.title);
    expect(result.calendarId).toBe('work');
    expect(result.people).toEqual(['ana']);
    expect(result.allDay).toBeUndefined();
  });

  it('preserves rrule + exdate through domain -> engine -> domain', () => {
    const original: CalendarEvent = {
      end: '2026-06-15T18:30:00.000Z',
      exdate: ['2026-06-22T17:30:00.000Z'],
      id: 'evt-r',
      rrule: { rule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=4' },
      start: '2026-06-15T17:30:00.000Z',
      title: 'Standup',
    };

    const result = fromEngineEvent(toEngineEvent(original));

    expect(result.rrule).toEqual({ rule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=4' });
    expect(result.exdate).toHaveLength(1);
    expect(new Date(result.exdate?.[0] ?? '').getTime()).toBe(
      new Date('2026-06-22T17:30:00.000Z').getTime(),
    );
  });

  it('preserves an all-day event through domain -> engine -> domain (verbatim dates)', () => {
    const original: CalendarEvent = {
      allDay: true,
      end: '2026-06-16',
      id: 'evt-2',
      start: '2026-06-15',
      title: 'Conference',
    };

    const result = fromEngineEvent(toEngineEvent(original));

    expect(result.allDay).toBe(true);
    expect(result.start).toBe('2026-06-15');
    expect(result.end).toBe('2026-06-16');
    expect(result.title).toBe('Conference');
  });
});
