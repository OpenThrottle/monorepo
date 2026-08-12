import { describe, expect, it, vi } from 'vitest';
import type { DriverLogger } from '../logger.ts';
import { noopDriverLogger } from '../logger.ts';

describe('noopDriverLogger', () => {
  it('conforms to the DriverLogger contract', () => {
    const logger: DriverLogger = noopDriverLogger;
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.verbose).toBe('function');
  });

  it('debug swallows any args and never throws', () => {
    expect(() =>
      noopDriverLogger.debug('phase started', { exitCode: 0 }),
    ).not.toThrow();
  });

  it('verbose swallows any args and never throws', () => {
    expect(() =>
      noopDriverLogger.verbose('chunk', { line: 'stdout output' }),
    ).not.toThrow();
  });

  it('debug and verbose return undefined and produce no observable side effects', () => {
    const writeSpy = vi.spyOn(process.stderr, 'write');

    const debugResult = noopDriverLogger.debug('anything');
    const verboseResult = noopDriverLogger.verbose('anything');

    expect(debugResult).toBeUndefined();
    expect(verboseResult).toBeUndefined();
    expect(writeSpy).not.toHaveBeenCalled();

    writeSpy.mockRestore();
  });

  it('accepts zero args', () => {
    expect(() => noopDriverLogger.debug()).not.toThrow();
    expect(() => noopDriverLogger.verbose()).not.toThrow();
  });

  it('accepts many args of mixed types', () => {
    expect(() =>
      noopDriverLogger.debug('msg', 1, true, null, undefined, ['a'], {
        k: 'v',
      }),
    ).not.toThrow();
  });
});
