import { describe, expect, test } from 'vitest';

import {
  backoffDelayMs,
  HOSTED_EMBEDDING_BACKOFF_BASE_MS,
  HOSTED_EMBEDDING_BACKOFF_MAX_MS,
  isRetryableStatus,
  l2Normalize,
} from '../hosted-embedding-request.ts';

describe('isRetryableStatus', () => {
  test.each([429, 500, 503])('retries %i', (status) => {
    expect(isRetryableStatus(status)).toBe(true);
  });

  test.each([400, 401, 404])('does not retry %i', (status) => {
    expect(isRetryableStatus(status)).toBe(false);
  });
});

describe('backoffDelayMs', () => {
  describe('when there is no Retry-After', () => {
    test('doubles per attempt and caps', () => {
      expect(backoffDelayMs(1, null)).toBe(HOSTED_EMBEDDING_BACKOFF_BASE_MS);
      expect(backoffDelayMs(2, null)).toBe(
        HOSTED_EMBEDDING_BACKOFF_BASE_MS * 2,
      );
      expect(backoffDelayMs(30, null)).toBe(HOSTED_EMBEDDING_BACKOFF_MAX_MS);
    });
  });

  describe('when Retry-After is seconds', () => {
    test('waits that long, capped', () => {
      expect(backoffDelayMs(1, '3')).toBe(3000);
      expect(backoffDelayMs(1, '3600')).toBe(HOSTED_EMBEDDING_BACKOFF_MAX_MS);
    });
  });

  describe('when Retry-After is an HTTP date', () => {
    test('waits until then', () => {
      const now = Date.parse('2026-11-15T00:00:00Z');

      expect(backoffDelayMs(1, 'Sun, 15 Nov 2026 00:00:05 GMT', now)).toBe(
        5000,
      );
    });
  });

  describe('when Retry-After is garbage', () => {
    test('falls back to exponential backoff', () => {
      expect(backoffDelayMs(1, 'soon')).toBe(HOSTED_EMBEDDING_BACKOFF_BASE_MS);
    });
  });
});

describe('l2Normalize', () => {
  test('scales to unit length', () => {
    expect(l2Normalize([3, 4])).toEqual([0.6, 0.8]);
  });

  test('leaves a zero vector alone', () => {
    expect(l2Normalize([0, 0])).toEqual([0, 0]);
  });
});
