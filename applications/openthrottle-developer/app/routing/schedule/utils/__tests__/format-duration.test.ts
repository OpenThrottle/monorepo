import { describe, expect, test } from 'vitest';
import { formatDuration } from '../format-duration';

describe('formatDuration', () => {
  test('renders an em dash when startedAt is missing', () => {
    expect(formatDuration(null, '2026-01-01T00:00:10.000Z')).toBe('—');
  });

  test('renders an em dash when finishedAt is missing', () => {
    expect(formatDuration('2026-01-01T00:00:00.000Z', null)).toBe('—');
  });

  test('renders an em dash when both timestamps are missing', () => {
    expect(formatDuration(undefined, undefined)).toBe('—');
  });

  test('renders an em dash when finishedAt is before startedAt', () => {
    expect(
      formatDuration('2026-01-01T00:00:10.000Z', '2026-01-01T00:00:00.000Z'),
    ).toBe('—');
  });

  test('rounds up a sub-second duration to 1s', () => {
    expect(
      formatDuration('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.400Z'),
    ).toBe('1s');
  });

  test('renders seconds only under a minute', () => {
    expect(
      formatDuration('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:42.000Z'),
    ).toBe('42s');
  });

  test('renders minutes and seconds under an hour', () => {
    expect(
      formatDuration('2026-01-01T00:00:00.000Z', '2026-01-01T00:02:03.000Z'),
    ).toBe('2m 3s');
  });

  test('renders hours, minutes, and seconds for an hour or more', () => {
    expect(
      formatDuration('2026-01-01T00:00:00.000Z', '2026-01-01T01:02:03.000Z'),
    ).toBe('1h 2m 3s');
  });

  test('includes 0m between hours and seconds when minutes are zero', () => {
    expect(
      formatDuration('2026-01-01T00:00:00.000Z', '2026-01-01T01:00:05.000Z'),
    ).toBe('1h 0m 5s');
  });
});
