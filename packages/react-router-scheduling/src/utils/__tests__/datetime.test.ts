import { describe, expect, it } from 'vitest';

// Use the ambient global `Temporal` — installed by the side-effect import chain
// in `../datetime` (`temporal-polyfill/global`) — to match the source-mandated
// global form. Importing the module-form `Temporal` here would assert against a
// potentially distinct class identity that the source warns is non-assignable.
import {
  systemTimeZone,
  temporalToDate,
  temporalToISOString,
  toPlainDate,
  toZonedDateTime,
} from '../datetime';

describe('systemTimeZone', () => {
  it('returns a non-empty IANA timezone id', () => {
    const zone = systemTimeZone();
    expect(typeof zone).toBe('string');
    expect(zone.length).toBeGreaterThan(0);
  });
});

describe('timed conversions (ZonedDateTime)', () => {
  const iso = '2026-06-15T17:30:00.000Z';

  it('round-trips a Date through ZonedDateTime preserving the exact instant', () => {
    const date = new Date(iso);
    const zoned = toZonedDateTime(date, 'America/New_York');
    expect(zoned).toBeInstanceOf(Temporal.ZonedDateTime);
    expect(temporalToDate(zoned).getTime()).toBe(date.getTime());
  });

  it('round-trips an ISO string through ZonedDateTime preserving the instant', () => {
    const zoned = toZonedDateTime(iso, 'Asia/Tokyo');
    expect(temporalToISOString(zoned)).toBe(iso.replace('.000Z', 'Z'));
  });

  it('honors the requested timezone offset without changing the instant', () => {
    const tokyo = toZonedDateTime(iso, 'Asia/Tokyo');
    const ny = toZonedDateTime(iso, 'America/New_York');
    expect(tokyo.epochMilliseconds).toBe(ny.epochMilliseconds);
    expect(tokyo.hour).not.toBe(ny.hour);
  });
});

// Earlier datetime coverage only exercises fixed-offset zones (Tokyo/NY at a
// summer instant). These pin the wall-clock fields across a US spring-forward
// (DST gap) and fall-back (DST overlap) boundary so a future change to the
// instant->wall-clock conversion can't silently shift the displayed time.
describe('DST boundary conversions (ZonedDateTime)', () => {
  // 2026-03-08: US spring-forward. Just before the transition (06:30Z) NY is
  // still EST (-05:00) and reads 01:30 — inside the last pre-gap hour.
  it('reads pre-transition EST wall-clock fields before the spring-forward gap', () => {
    const zoned = toZonedDateTime(
      '2026-03-08T06:30:00.000Z',
      'America/New_York',
    );
    expect(zoned.hour).toBe(1);
    expect(zoned.minute).toBe(30);
    expect(zoned.day).toBe(8);
    expect(zoned.offset).toBe('-05:00');
  });

  // At 07:00Z the clock springs forward: 02:00 EST never occurs, so the wall
  // clock jumps straight to 03:00 EDT (-04:00). The 02:00 hour is the gap.
  it('jumps the wall clock to EDT across the spring-forward gap', () => {
    const zoned = toZonedDateTime(
      '2026-03-08T07:00:00.000Z',
      'America/New_York',
    );
    expect(zoned.hour).toBe(3);
    expect(zoned.day).toBe(8);
    expect(zoned.offset).toBe('-04:00');
  });

  // 2026-11-01: US fall-back. 05:00Z is still EDT (-04:00) and reads 01:00 —
  // the FIRST pass through the repeated 01:00 hour.
  it('resolves the first repeated hour to EDT at the fall-back overlap', () => {
    const zoned = toZonedDateTime(
      '2026-11-01T05:00:00.000Z',
      'America/New_York',
    );
    expect(zoned.hour).toBe(1);
    expect(zoned.offset).toBe('-04:00');
  });

  // One real hour later (06:00Z) is EST (-05:00) and again reads 01:00 — the
  // SECOND pass through the repeated hour. Same wall-clock, distinct instant.
  it('resolves the second repeated hour to EST at the fall-back overlap', () => {
    const zoned = toZonedDateTime(
      '2026-11-01T06:00:00.000Z',
      'America/New_York',
    );
    expect(zoned.hour).toBe(1);
    expect(zoned.offset).toBe('-05:00');
  });
});

// `toPlainDate(Date)` follows host-local wall-clock fields. Pin its behavior at
// a spring-forward instant: the polyfill global is installed, but the Date
// accessors used by `toPlainDate` are host-`TZ` dependent, so assert against the
// same Date's own accessors to stay deterministic across runners.
describe('all-day conversions across a DST boundary (PlainDate)', () => {
  it('derives the host-local calendar day from a spring-forward instant', () => {
    const instant = new Date('2026-03-08T07:00:00.000Z');
    const plain = toPlainDate(instant);
    expect(plain.year).toBe(instant.getFullYear());
    expect(plain.month).toBe(instant.getMonth() + 1);
    expect(plain.day).toBe(instant.getDate());
  });
});

describe('all-day conversions (PlainDate)', () => {
  it('takes a date-only string verbatim and round-trips it to ISO', () => {
    const plain = toPlainDate('2026-06-15');
    expect(plain).toBeInstanceOf(Temporal.PlainDate);
    expect(temporalToISOString(plain)).toBe('2026-06-15');
  });

  it('derives the local calendar date from a Date', () => {
    const date = new Date(2026, 5, 15, 9, 0, 0); // local June 15 2026
    const plain = toPlainDate(date);
    expect(plain.year).toBe(2026);
    expect(plain.month).toBe(6);
    expect(plain.day).toBe(15);
  });

  // Cross-midnight pin: an instant-bearing value resolves to its HOST-LOCAL
  // calendar day, which can differ from the UTC day for an instant near
  // midnight. Asserting against the same `Date`'s local field accessors makes
  // this deterministic regardless of the runner's `TZ`, while documenting that
  // `toPlainDate(Date)` follows local wall-clock fields (not the instant).
  it('derives the host-local calendar day from an instant near midnight (cross-midnight)', () => {
    const instant = new Date('2026-06-15T23:30:00.000Z');
    const plain = toPlainDate(instant);
    expect(plain.year).toBe(instant.getFullYear());
    expect(plain.month).toBe(instant.getMonth() + 1);
    expect(plain.day).toBe(instant.getDate());
  });

  it('derives the host-local calendar day from an instant-bearing ISO string', () => {
    const iso = '2026-06-15T23:30:00.000Z';
    const plain = toPlainDate(iso);
    const reference = new Date(iso);
    expect(plain.year).toBe(reference.getFullYear());
    expect(plain.month).toBe(reference.getMonth() + 1);
    expect(plain.day).toBe(reference.getDate());
  });

  it('maps a PlainDate back to a local-midnight Date', () => {
    const plain = toPlainDate('2026-06-15');
    const date = temporalToDate(plain);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(0);
  });
});
