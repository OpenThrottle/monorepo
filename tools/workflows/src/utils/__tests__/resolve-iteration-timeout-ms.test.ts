/**
 * @description Unit tests for {@link resolveIterationTimeoutMs} — the shared guard that
 * keeps `--iteration-timeout` below Node's `setTimeout` overflow ceiling (~24.8 days).
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_ITERATION_TIMEOUT_MS,
  MAX_ITERATION_TIMEOUT_SECONDS,
  resolveIterationTimeoutMs,
} from '../ralph-runtime-config';

describe('resolveIterationTimeoutMs', () => {
  it('returns undefined for undefined input', () => {
    expect(resolveIterationTimeoutMs(undefined)).toBeUndefined();
  });

  it('returns undefined for values below 1 second', () => {
    expect(resolveIterationTimeoutMs(0)).toBeUndefined();
  });

  it('converts seconds to milliseconds', () => {
    expect(resolveIterationTimeoutMs(120)).toBe(120_000);
  });

  it('accepts the exact maximum without throwing', () => {
    expect(resolveIterationTimeoutMs(MAX_ITERATION_TIMEOUT_SECONDS)).toBe(
      MAX_ITERATION_TIMEOUT_SECONDS * 1000,
    );
    expect(MAX_ITERATION_TIMEOUT_SECONDS * 1000).toBeLessThanOrEqual(
      MAX_ITERATION_TIMEOUT_MS,
    );
  });

  it('throws when seconds * 1000 would overflow Node timers', () => {
    expect(() =>
      resolveIterationTimeoutMs(MAX_ITERATION_TIMEOUT_SECONDS + 1),
    ).toThrow(/--iteration-timeout must be <=/);
  });
});
