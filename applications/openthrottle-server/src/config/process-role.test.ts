import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveProcessRole } from './process-role';

describe('resolveProcessRole', () => {
  const originalRole = process.env.PROCESS_ROLE;

  beforeEach(() => {
    delete process.env.PROCESS_ROLE;
  });

  afterEach(() => {
    if (originalRole === undefined) {
      delete process.env.PROCESS_ROLE;
    } else {
      process.env.PROCESS_ROLE = originalRole;
    }
  });

  it('defaults to all when PROCESS_ROLE is unset', () => {
    expect(resolveProcessRole()).toBe('all');
  });

  it('defaults to all when PROCESS_ROLE is blank', () => {
    process.env.PROCESS_ROLE = '  ';

    expect(resolveProcessRole()).toBe('all');
  });

  it('accepts api, worker, and all (case-insensitive)', () => {
    process.env.PROCESS_ROLE = 'api';
    expect(resolveProcessRole()).toBe('api');

    process.env.PROCESS_ROLE = 'WORKER';
    expect(resolveProcessRole()).toBe('worker');

    process.env.PROCESS_ROLE = 'All';
    expect(resolveProcessRole()).toBe('all');
  });

  it('fails fast on an unknown role instead of running the wrong module graph', () => {
    process.env.PROCESS_ROLE = 'apii';

    expect(() => resolveProcessRole()).toThrow('Invalid PROCESS_ROLE "apii"');
  });
});
