import { describe, expect, it } from 'vitest';

import { createElementId } from '../element-id';

describe('createElementId', () => {
  it('returns a non-empty id', () => {
    expect(createElementId().length).toBeGreaterThan(0);
  });

  it('returns unique ids across calls', () => {
    const ids = new Set([
      createElementId(),
      createElementId(),
      createElementId(),
    ]);
    expect(ids.size).toBe(3);
  });
});
