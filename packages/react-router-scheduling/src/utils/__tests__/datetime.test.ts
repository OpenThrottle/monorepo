import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';

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

  it('maps a PlainDate back to a local-midnight Date', () => {
    const plain = toPlainDate('2026-06-15');
    const date = temporalToDate(plain);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(0);
  });
});
