import { describe, expect, test } from 'vitest';
import { mergeAgentCliStatuses } from './agent-clis.data';

describe('mergeAgentCliStatuses', () => {
  test('marks every catalog entry not-installed when nothing is available', () => {
    const rows = mergeAgentCliStatuses([]);

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.installed).toBe(false);
      expect(row.models).toEqual([]);
      expect(row.version).toBeNull();
    }
  });

  test('flips a catalog entry to installed with its probed version + models', () => {
    const [first] = mergeAgentCliStatuses([]);
    expect(first).toBeDefined();
    if (first === undefined) return;

    const rows = mergeAgentCliStatuses([
      {
        backend: first.backend,
        label: first.label,
        models: ['m-1'],
        version: '1.2.3',
      },
    ]);
    const merged = rows.find((row) => row.backend === first.backend);

    expect(merged?.installed).toBe(true);
    expect(merged?.models).toEqual(['m-1']);
    expect(merged?.version).toBe('1.2.3');
  });
});
