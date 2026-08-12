import { describe, expect, it } from 'vitest';

import { TEMPORAL_POLYFILL_INSTALLED } from '../temporal-bootstrap';

describe('temporal-bootstrap', () => {
  it('exports a truthy marker confirming the module was imported', () => {
    expect(TEMPORAL_POLYFILL_INSTALLED).toBe(true);
  });

  it('installs the Temporal global as a side effect of import', () => {
    expect(globalThis.Temporal).toBeDefined();
  });

  it('installs Date.prototype.toTemporalInstant as a side effect of import', () => {
    expect(typeof Date.prototype.toTemporalInstant).toBe('function');
  });

  it('yields a usable Temporal.Now entry point', () => {
    expect(() => globalThis.Temporal.Now.instant()).not.toThrow();
  });
});
