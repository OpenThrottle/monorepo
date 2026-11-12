import { describe, expect, it } from 'vitest';

import { buildPartitionName } from './buildPartitionName.ts';

describe('buildPartitionName', () => {
  it('is a persistent partition and stable for an origin', () => {
    const name = buildPartitionName('http://localhost:6021');

    expect(name).toMatch(/^persist:ot-[0-9a-f]{16}$/);
    expect(buildPartitionName('http://localhost:6021')).toBe(name);
  });

  it('differs per origin, even for the same host', () => {
    const names = new Set([
      buildPartitionName('http://localhost:6021'),
      buildPartitionName('http://127.0.0.1:6021'),
      buildPartitionName('https://localhost:6021'),
      buildPartitionName('http://localhost:6022'),
    ]);

    expect(names.size).toBe(4);
  });
});
