import { describe, expect, it } from 'vitest';

import {
  CAPTURE_HEALTH_STREAMS,
  toCaptureHealthRows,
} from './capture-health.ts';

describe('toCaptureHealthRows', () => {
  it('tags each row with the stream and keeps Date values as-is', () => {
    const lastCapturedAt = new Date('2026-10-29T10:00:00.000Z');

    expect(
      toCaptureHealthRows(CAPTURE_HEALTH_STREAMS.SKILL_EVENTS, [
        { lastCapturedAt, source: 'claude-code' },
      ]),
    ).toEqual([
      { lastCapturedAt, source: 'claude-code', stream: 'skill_events' },
    ]);
  });

  describe('when pg returns the timestamp as a string', () => {
    it('parses it into a Date', () => {
      const rows = toCaptureHealthRows(CAPTURE_HEALTH_STREAMS.TOKEN_USAGE, [
        { lastCapturedAt: '2026-10-29T10:00:00.000Z', source: 'claude' },
      ]);

      expect(rows[0]?.lastCapturedAt).toEqual(
        new Date('2026-10-29T10:00:00.000Z'),
      );
    });
  });

  describe('when the source is null', () => {
    it('falls back to unknown', () => {
      const rows = toCaptureHealthRows(CAPTURE_HEALTH_STREAMS.TOKEN_USAGE, [
        { lastCapturedAt: new Date(0), source: null },
      ]);

      expect(rows[0]?.source).toBe('unknown');
    });
  });

  describe('when the timestamp is missing or unreadable', () => {
    it('drops the row instead of inventing a time', () => {
      expect(
        toCaptureHealthRows(CAPTURE_HEALTH_STREAMS.SKILL_OUTCOMES, [
          { lastCapturedAt: null, source: 'cursor' },
          { lastCapturedAt: 'not-a-date', source: 'codex' },
        ]),
      ).toEqual([]);
    });
  });
});
