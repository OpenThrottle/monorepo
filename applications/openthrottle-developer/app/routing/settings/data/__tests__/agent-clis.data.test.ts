import { describe, expect, test } from 'vitest';
import {
  filterAgentCliStatuses,
  mergeAgentCliStatuses,
  type AgentCliStatus,
} from '../agent-clis.data';

describe('mergeAgentCliStatuses', () => {
  test('marks every catalog entry not-installed (and enabled) when nothing is available', () => {
    const rows = mergeAgentCliStatuses([]);

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.installed).toBe(false);
      expect(row.enabled).toBe(true);
      expect(row.models).toEqual([]);
      expect(row.version).toBeNull();
    }
  });

  test('flips a catalog entry to installed with its probed version + models + enabled', () => {
    const [first] = mergeAgentCliStatuses([]);
    expect(first).toBeDefined();
    if (first === undefined) return;

    const rows = mergeAgentCliStatuses([
      {
        backend: first.backend,
        enabled: true,
        label: first.label,
        modelOptions: [
          { enabled: true, favorite: true, model: 'm-1' },
          { enabled: false, favorite: false, model: 'm-2' },
        ],
        version: '1.2.3',
      },
    ]);
    const merged = rows.find((row) => row.backend === first.backend);

    expect(merged?.installed).toBe(true);
    expect(merged?.enabled).toBe(true);
    // Flat `models` is derived from modelOptions (all model ids, order preserved).
    expect(merged?.models).toEqual(['m-1', 'm-2']);
    expect(merged?.modelOptions).toEqual([
      { enabled: true, favorite: true, model: 'm-1' },
      { enabled: false, favorite: false, model: 'm-2' },
    ]);
    expect(merged?.version).toBe('1.2.3');
  });

  test('carries a disabled agent through as enabled=false', () => {
    const [first] = mergeAgentCliStatuses([]);
    expect(first).toBeDefined();
    if (first === undefined) return;

    const rows = mergeAgentCliStatuses([
      {
        backend: first.backend,
        enabled: false,
        label: first.label,
        modelOptions: [],
        version: '1.0.0',
      },
    ]);
    const merged = rows.find((row) => row.backend === first.backend);

    expect(merged?.installed).toBe(true);
    expect(merged?.enabled).toBe(false);
  });
});

describe('filterAgentCliStatuses', () => {
  const row = (over: Partial<AgentCliStatus>): AgentCliStatus => ({
    backend: 'x',
    enabled: true,
    installUrl: 'https://x',
    installed: true,
    label: 'X',
    modelOptions: [],
    models: [],
    version: null,
    ...over,
  });

  const statuses: AgentCliStatus[] = [
    row({ backend: 'a', enabled: true, installed: true }),
    row({ backend: 'b', enabled: false, installed: true }),
    row({ backend: 'c', enabled: true, installed: false }),
  ];

  test('all passes everything', () => {
    expect(filterAgentCliStatuses(statuses, 'all')).toHaveLength(3);
  });

  test('installed keeps only detected CLIs', () => {
    expect(
      filterAgentCliStatuses(statuses, 'installed').map((s) => s.backend),
    ).toEqual(['a', 'b']);
  });

  test('enabled keeps only non-disabled CLIs', () => {
    expect(
      filterAgentCliStatuses(statuses, 'enabled').map((s) => s.backend),
    ).toEqual(['a', 'c']);
  });
});
