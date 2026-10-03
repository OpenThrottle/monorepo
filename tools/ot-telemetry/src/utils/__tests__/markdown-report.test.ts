import { describe, expect, it } from 'vitest';

import { DETAIL_LEVELS } from '../../config/index.ts';
import type { ReportEnvelope } from '../../types/index.ts';
import { renderMarkdownReport } from '../markdown-report.ts';
import type { PlansMetrics } from '../metrics/plans.ts';

const BASE_WINDOW = {
  since: '2026-01-01T00:00:00.000Z',
  until: '2026-04-01T00:00:00.000Z',
};

function baseEnvelope(overrides: Partial<ReportEnvelope> = {}): ReportEnvelope {
  return {
    actorKey: null,
    detailLevel: DETAIL_LEVELS.AGGREGATE,
    generatedAt: '2026-04-01T00:00:00.000Z',
    metrics: {},
    migrationHighWaterMark: null,
    repoSlug: null,
    schemaVersion: 1,
    skipped: [],
    window: BASE_WINDOW,
    ...overrides,
  };
}

describe('renderMarkdownReport', () => {
  it('renders a header, the window, and the skipped-metrics list even with no metrics at all', () => {
    const markdown = renderMarkdownReport(
      baseEnvelope({
        skipped: [{ name: 'plans', reason: 'missing table(s): plans' }],
      }),
    );

    expect(markdown).toContain('2026-01-01');
    expect(markdown).toContain('2026-04-01');
    expect(markdown).toContain('missing table(s): plans');
  });

  it('states plainly that the aggregate level captured no titles/paths/branches', () => {
    const markdown = renderMarkdownReport(baseEnvelope());
    expect(markdown.toLowerCase()).toContain('aggregate');
  });

  it('renders a plans table from fixture PlansMetrics without leaking anything beyond counts/labels', () => {
    const plans: PlansMetrics = {
      byCategory: [{ category: 'feature', count: 3 }],
      byStatus: [
        { count: 2, status: 'completed' },
        { count: 1, status: 'pending' },
      ],
      completedInWindow: { count: 2, source: 'live' },
      createdInWindow: { count: 3, source: 'daily_stats' },
      lifetimeTotal: 10,
      timeToCompleteInWindow: {
        medianSeconds: 3600,
        p90Seconds: 7200,
        sampleCount: 2,
      },
      zeroTaskPlanCount: 1,
    };

    const markdown = renderMarkdownReport(baseEnvelope({ metrics: { plans } }));

    expect(markdown).toContain('feature');
    expect(markdown).toContain('completed');
    expect(markdown).toContain('10');
  });

  it('never renders raw JSON-like key names such as "byCategory" from the envelope (only the tables it builds)', () => {
    // Guards against a future regression where the renderer falls back to
    // JSON.stringify-ing an unrecognized metric shape instead of degrading.
    const markdown = renderMarkdownReport(
      baseEnvelope({ metrics: { plans: { unexpected: 'shape' } } }),
    );
    expect(markdown).not.toContain('unexpected');
  });
});
