/**
 * Unit tests for stderr logging (`utils/logging`).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logHookError } from '../logging';

describe('logHookError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the message alone when no error is provided', () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    logHookError('capture failed');

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(
      '[skill-usage-capture] capture failed\n',
    );
  });

  it('appends the Error message when err is an Error instance', () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    logHookError('capture failed', new Error('disk full'));

    expect(write).toHaveBeenCalledWith(
      '[skill-usage-capture] capture failed: disk full\n',
    );
  });

  it('appends the stringified value when err is a non-Error value', () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    logHookError('capture failed', 42);

    expect(write).toHaveBeenCalledWith(
      '[skill-usage-capture] capture failed: 42\n',
    );
  });

  it('omits the trailing detail when err is null or undefined', () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    logHookError('capture failed', null);
    logHookError('capture failed', undefined);

    expect(write).toHaveBeenNthCalledWith(
      1,
      '[skill-usage-capture] capture failed\n',
    );
    expect(write).toHaveBeenNthCalledWith(
      2,
      '[skill-usage-capture] capture failed\n',
    );
  });

  it('never throws even when process.stderr.write itself throws', () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => {
      throw new Error('EPIPE');
    });

    expect(() =>
      logHookError('capture failed', new Error('disk full')),
    ).not.toThrow();
  });
});
