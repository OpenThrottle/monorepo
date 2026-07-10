import { describe, expect, test } from 'vitest';
import { buildUsageSupportSnapshotJson } from '~/routing/usage/utils/build-usage-support-snapshot';

describe('buildUsageSupportSnapshotJson', () => {
  test('includes range, rows, and summed totals', () => {
    const row = {
      date: '2026-01-15',
      plansCompleted: 1,
      plansCreated: 0,
      plansUpdated: 2,
      tasksCompleted: 0,
      tasksCreated: 1,
      tasksUpdated: 0,
    };

    const json = buildUsageSupportSnapshotJson({
      dailyStats: [row],
      rangeDays: 30,
      rangeEndIso: '2026-02-01T00:00:00.000Z',
      rangeStartIso: '2026-01-01T00:00:00.000Z',
    });

    const parsed: {
      readonly analyticsNote: string;
      readonly dailyRows: unknown[];
      readonly generatedAt: string;
      readonly rangeDays: number;
      readonly rangeEnd: string;
      readonly rangeStart: string;
      readonly totals: {
        readonly plansCompleted: number;
        readonly plansCreated: number;
        readonly plansUpdated: number;
        readonly tasksCompleted: number;
        readonly tasksCreated: number;
        readonly tasksUpdated: number;
      };
    } = JSON.parse(json);

    expect(parsed.rangeDays).toBe(30);
    expect(parsed.rangeStart).toBe('2026-01-01T00:00:00.000Z');
    expect(parsed.rangeEnd).toBe('2026-02-01T00:00:00.000Z');
    expect(parsed.dailyRows).toEqual([row]);
    expect(parsed.totals).toEqual({
      plansCompleted: 1,
      plansCreated: 0,
      plansUpdated: 2,
      tasksCompleted: 0,
      tasksCreated: 1,
      tasksUpdated: 0,
    });
    expect(parsed.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(parsed.analyticsNote.length).toBeGreaterThan(10);
  });
});
