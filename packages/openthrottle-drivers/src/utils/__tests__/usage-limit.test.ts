/**
 * @description Unit tests for the Claude usage-limit parsers: only a `rejected` rate-limit status is
 * a limit, epoch seconds become ISO, and the 429 result predicate keys on structured fields only.
 */

import { describe, expect, it } from 'vitest';

import {
  isClaudeUsageLimitResult,
  parseClaudeRateLimitInfo,
} from '../usage-limit.ts';

describe('parseClaudeRateLimitInfo', () => {
  it('returns the limit with ISO resetsAt for a rejected status', () => {
    expect(
      parseClaudeRateLimitInfo({
        rateLimitType: 'five_hour',
        resetsAt: 1_800_000_000,
        status: 'rejected',
      }),
    ).toEqual({
      rateLimitType: 'five_hour',
      resetsAt: new Date(1_800_000_000_000).toISOString(),
    });
  });

  it('returns null for allowed and allowed_warning', () => {
    expect(parseClaudeRateLimitInfo({ status: 'allowed' })).toBeNull();
    expect(
      parseClaudeRateLimitInfo({ resetsAt: 1, status: 'allowed_warning' }),
    ).toBeNull();
  });

  it('returns null for non-records', () => {
    expect(parseClaudeRateLimitInfo(undefined)).toBeNull();
    expect(parseClaudeRateLimitInfo('rejected')).toBeNull();
    expect(parseClaudeRateLimitInfo(['rejected'])).toBeNull();
  });

  it('nulls resetsAt when it is missing, non-numeric, or non-finite', () => {
    expect(parseClaudeRateLimitInfo({ status: 'rejected' })).toEqual({
      rateLimitType: null,
      resetsAt: null,
    });
    expect(
      parseClaudeRateLimitInfo({ resetsAt: '1800000000', status: 'rejected' })
        ?.resetsAt,
    ).toBeNull();
    expect(
      parseClaudeRateLimitInfo({ resetsAt: Number.NaN, status: 'rejected' })
        ?.resetsAt,
    ).toBeNull();
    expect(
      parseClaudeRateLimitInfo({
        resetsAt: Number.POSITIVE_INFINITY,
        status: 'rejected',
      })?.resetsAt,
    ).toBeNull();
    expect(
      parseClaudeRateLimitInfo({ resetsAt: 1e20, status: 'rejected' })
        ?.resetsAt,
    ).toBeNull();
  });

  it('nulls a non-string rateLimitType', () => {
    expect(
      parseClaudeRateLimitInfo({ rateLimitType: 5, status: 'rejected' })
        ?.rateLimitType,
    ).toBeNull();
  });
});

describe('isClaudeUsageLimitResult', () => {
  it('is true for an error result with api_error_status 429', () => {
    expect(
      isClaudeUsageLimitResult({
        api_error_status: 429,
        is_error: true,
        result: 'anything',
        type: 'result',
      }),
    ).toBe(true);
  });

  it('is false when any structured field differs', () => {
    expect(
      isClaudeUsageLimitResult({
        api_error_status: 500,
        is_error: true,
        type: 'result',
      }),
    ).toBe(false);
    expect(
      isClaudeUsageLimitResult({
        api_error_status: 429,
        is_error: false,
        type: 'result',
      }),
    ).toBe(false);
    expect(
      isClaudeUsageLimitResult({
        api_error_status: 429,
        is_error: true,
        type: 'system',
      }),
    ).toBe(false);
    expect(isClaudeUsageLimitResult(null)).toBe(false);
    expect(isClaudeUsageLimitResult('result')).toBe(false);
  });
});
