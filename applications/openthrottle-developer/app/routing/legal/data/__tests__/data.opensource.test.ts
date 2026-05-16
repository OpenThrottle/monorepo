import { describe, expect, test } from 'vitest';
import { opensource } from '~/routing/legal/data/data.opensource';

describe('routing/legal data.opensource', () => {
  test('each entry has name, image URL, and external URL', () => {
    for (const entry of opensource) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.image).toMatch(/^https?:\/\//);
      expect(entry.url).toMatch(/^https?:\/\//);
    }
  });

  test('lists expected stack projects used on the legal page', () => {
    const names = opensource.map((o) => o.name);
    expect(names).toContain('BullMQ');
    expect(names).toContain('NestJS');
    expect(names).toContain('PostgreSQL');
    expect(names).toContain('React Router');
    expect(opensource.length).toBeGreaterThanOrEqual(8);
  });
});
