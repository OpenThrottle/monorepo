import { describe, expect, test } from 'vitest';

import type { AgentCliStatus } from '~/routing/settings/data/data.agent-clis';
import {
  collectAgentCliAuthWarnings,
  filterAgentCliStatuses,
  mergeAgentCliStatuses,
} from '~/routing/settings/utils/agent-cli-statuses';

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
        driver: first.driver,
        enabled: true,
        label: first.label,
        modelOptions: [
          { enabled: true, favorite: true, model: 'm-1' },
          { enabled: false, favorite: false, model: 'm-2' },
        ],
        version: '1.2.3',
      },
    ]);
    const merged = rows.find((row) => row.driver === first.driver);

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
        driver: first.driver,
        enabled: false,
        label: first.label,
        modelOptions: [],
        version: '1.0.0',
      },
    ]);
    const merged = rows.find((row) => row.driver === first.driver);

    expect(merged?.installed).toBe(true);
    expect(merged?.enabled).toBe(false);
  });
});

describe('filterAgentCliStatuses', () => {
  const row = (over: Partial<AgentCliStatus>): AgentCliStatus => {
    return {
      driver: 'x',
      enabled: true,
      installUrl: 'https://x',
      installed: true,
      label: 'X',
      modelOptions: [],
      models: [],
      version: null,
      ...over,
    };
  };

  const statuses: AgentCliStatus[] = [
    row({ driver: 'a', enabled: true, installed: true }),
    row({ driver: 'b', enabled: false, installed: true }),
    row({ driver: 'c', enabled: true, installed: false }),
  ];

  test('all passes everything', () => {
    expect(filterAgentCliStatuses(statuses, 'all')).toHaveLength(3);
  });

  test('installed keeps only detected CLIs', () => {
    expect(
      filterAgentCliStatuses(statuses, 'installed').map((s) => s.driver),
    ).toEqual(['a', 'b']);
  });

  test('enabled keeps only non-disabled CLIs', () => {
    expect(
      filterAgentCliStatuses(statuses, 'enabled').map((s) => s.driver),
    ).toEqual(['a', 'c']);
  });
});

describe('collectAgentCliAuthWarnings', () => {
  test('keeps only agents that carry a non-empty auth warning, in order', () => {
    expect(
      collectAgentCliAuthWarnings([
        { auth: null, driver: 'cursor', label: 'Cursor Agent' },
        { driver: 'codex', label: 'Codex' },
        { auth: { warning: null }, driver: 'grok', label: 'Grok' },
        { auth: { warning: '' }, driver: 'antigravity', label: 'Antigravity' },
        {
          auth: { warning: 'ANTHROPIC_API_KEY is set.' },
          driver: 'claude',
          label: 'Claude Code',
        },
      ]),
    ).toEqual([
      {
        driver: 'claude',
        label: 'Claude Code',
        warning: 'ANTHROPIC_API_KEY is set.',
      },
    ]);
  });
});
