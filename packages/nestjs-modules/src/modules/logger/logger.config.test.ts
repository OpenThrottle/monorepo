import { describe, expect, it } from 'vitest';
import { getLogger, logger } from './logger.config';

describe('getLogger', () => {
  it('returns a logger without a name when none is given', () => {
    const instance = getLogger();

    expect(instance).toBeDefined();
    expect(instance.defaultMeta?.name).toBeUndefined();
  });

  it('exports a default unnamed logger', () => {
    expect(logger).toBeDefined();
    expect(logger.defaultMeta?.name).toBeUndefined();
  });

  it('returns a named child logger when a name is given', () => {
    const named = 'my-feature';
    const child = getLogger(named);

    expect(child).toBeDefined();
    // child() returns a distinct logger instance from its parent.
    expect(child).not.toBe(logger);
    // The child carries the name as bound metadata on every record.
    expect(child.defaultMeta?.name).toBe(named);
  });
});
