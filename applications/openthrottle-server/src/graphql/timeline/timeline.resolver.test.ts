/**
 * @description Unit tests for the workstream timeline resolver: window bounds,
 * per-kind row caps and truncation, filter combinations, open-ended sessions,
 * and the derived-end rule that keeps a queued-at from reading as a start.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { PlansService } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TimelineLaneGrouping,
  TimelineMarkerKind,
  TimelineSpanKind,
} from './timeline.enum';
import { TimelineResolver } from './timeline.resolver';
import type { WorkstreamTimelineInput } from './timeline.input';

type QueryFn = (sql: string, params?: unknown[]) => Promise<unknown[]>;

/** Mirrors the resolver's own cap; asserted rather than imported so a change is visible here. */
const ROWS_PER_KIND = 500;

const baseInput = (
  overrides: Partial<WorkstreamTimelineInput> = {},
): WorkstreamTimelineInput => ({
  backend: null,
  checkoutId: null,
  from: new Date('2026-09-01T00:00:00Z'),
  gitBranch: null,
  grouping: null,
  markerKinds: [],
  planId: null,
  spanKinds: [],
  to: new Date('2026-09-08T00:00:00Z'),
  ...overrides,
});

describe('TimelineResolver.workstreamTimeline', () => {
  let query: ReturnType<typeof vi.fn<QueryFn>>;
  let resolver: TimelineResolver;

  beforeEach(() => {
    query = vi.fn().mockResolvedValue([]);
    const plansService = createMock<PlansService>({
      getRepository: vi.fn().mockReturnValue({ manager: { query } }),
    });
    resolver = new TimelineResolver(plansService);
  });

  describe('window bounds', () => {
    it('rejects a window wider than the documented maximum', async () => {
      await expect(
        resolver.workstreamTimeline(
          baseInput({
            from: new Date('2026-01-01T00:00:00Z'),
            to: new Date('2026-12-01T00:00:00Z'),
          }),
        ),
      ).rejects.toThrow(/90 days/);

      expect(query).not.toHaveBeenCalled();
    });

    it('rejects an inverted window', async () => {
      await expect(
        resolver.workstreamTimeline(
          baseInput({
            from: new Date('2026-09-08T00:00:00Z'),
            to: new Date('2026-09-01T00:00:00Z'),
          }),
        ),
      ).rejects.toThrow(/after from/);
    });

    it('accepts a window exactly at the maximum', async () => {
      const result = await resolver.workstreamTimeline(
        baseInput({
          from: new Date('2026-01-01T00:00:00Z'),
          to: new Date('2026-04-01T00:00:00Z'),
        }),
      );

      expect(result.spans).toEqual([]);
    });
  });

  describe('kind allowlist', () => {
    it('issues no query at all when both kind lists are empty', async () => {
      await resolver.workstreamTimeline(baseInput());

      expect(query).not.toHaveBeenCalled();
    });

    it('queries only the requested kinds', async () => {
      await resolver.workstreamTimeline(
        baseInput({
          markerKinds: [TimelineMarkerKind.GRILLING],
          spanKinds: [TimelineSpanKind.PLAN_RUN],
        }),
      );

      expect(query).toHaveBeenCalledTimes(2);
      const sql = query.mock.calls.map(([text]) => text).join('\n');
      expect(sql).toContain('FROM plan_runs');
      expect(sql).toContain("skill_name = 'grilling'");
      expect(sql).not.toContain('scheduled_agent_job_runs');
    });

    it('queries every kind when the lists are null', async () => {
      await resolver.workstreamTimeline(
        baseInput({ markerKinds: null, spanKinds: null }),
      );

      // 3 span kinds + 6 marker kinds
      expect(query).toHaveBeenCalledTimes(9);
    });
  });

  describe('row caps and truncation', () => {
    it('applies a LIMIT to every leg', async () => {
      await resolver.workstreamTimeline(
        baseInput({ markerKinds: null, spanKinds: null }),
      );

      for (const [sql] of query.mock.calls) {
        expect(sql).toMatch(/LIMIT \$\d+/);
      }
    });

    it('flags truncation once a leg fills its cap', async () => {
      query.mockResolvedValue(
        Array.from({ length: ROWS_PER_KIND }, (_unused, index) => ({
          at: '2026-09-02T00:00:00Z',
          branch: null,
          id: `task-${index}`,
          plan_id: 'plan-1',
          plan_title: 'Plan One',
          task_id: `task-${index}`,
          title: 'A task',
          url: null,
        })),
      );

      const result = await resolver.workstreamTimeline(
        baseInput({ markerKinds: [TimelineMarkerKind.TASK_ADDED] }),
      );

      expect(result.truncation).toEqual([
        { kind: 'TASK_ADDED', returned: ROWS_PER_KIND, truncated: true },
      ]);
    });

    it('does not flag truncation for a short leg', async () => {
      query.mockResolvedValue([
        {
          at: '2026-09-02T00:00:00Z',
          branch: null,
          id: 'task-1',
          plan_id: 'plan-1',
          plan_title: 'Plan One',
          task_id: 'task-1',
          title: 'A task',
          url: null,
        },
      ]);

      const result = await resolver.workstreamTimeline(
        baseInput({ markerKinds: [TimelineMarkerKind.TASK_ADDED] }),
      );

      expect(result.truncation[0]?.truncated).toBe(false);
      expect(result.markers).toHaveLength(1);
    });
  });

  describe('derived ends', () => {
    it('always flags a plan run end as derived, even when the row is closed', async () => {
      query.mockResolvedValue([
        {
          backend: 'claude',
          branch: 'feat/x',
          checkout_id: null,
          conversation_id: null,
          ends_at: '2026-09-02T01:00:00Z',
          id: 'run-1',
          model: 'claude-opus-5',
          plan_id: 'plan-1',
          plan_title: 'Plan One',
          starts_at: '2026-09-02T00:00:00Z',
          status: 'COMPLETED',
          title: 'Plan One',
        },
      ]);

      const result = await resolver.workstreamTimeline(
        baseInput({ spanKinds: [TimelineSpanKind.PLAN_RUN] }),
      );

      expect(result.spans[0]?.derivedEnd).toBe(true);
      expect(result.spans[0]?.endsAt).toEqual(new Date('2026-09-02T01:00:00Z'));
    });

    it('treats a closed work session as measured', async () => {
      query.mockResolvedValue([
        {
          backend: 'claude-code',
          branch: null,
          checkout_id: null,
          conversation_id: null,
          ends_at: '2026-09-02T02:00:00Z',
          id: 'session-1',
          model: null,
          plan_id: 'plan-1',
          plan_title: 'Plan One',
          starts_at: '2026-09-02T00:00:00Z',
          status: 'explicit',
          title: 'A session',
        },
      ]);

      const result = await resolver.workstreamTimeline(
        baseInput({ spanKinds: [TimelineSpanKind.WORK_SESSION] }),
      );

      expect(result.spans[0]?.derivedEnd).toBe(false);
    });

    it('clamps an open session to now and flags it derived', async () => {
      query.mockResolvedValue([
        {
          backend: 'claude-code',
          branch: null,
          checkout_id: null,
          conversation_id: null,
          ends_at: null,
          id: 'session-open',
          model: null,
          plan_id: null,
          plan_title: null,
          starts_at: '2026-09-02T00:00:00Z',
          status: null,
          title: 'An open session',
        },
      ]);

      const before = Date.now();
      const result = await resolver.workstreamTimeline(
        baseInput({ spanKinds: [TimelineSpanKind.WORK_SESSION] }),
      );

      const span = result.spans[0];
      expect(span?.derivedEnd).toBe(true);
      expect(span?.endsAt.getTime()).toBeGreaterThanOrEqual(before);
      // Subjectless sessions are first-class; they land in the shared lane.
      expect(span?.laneKey).toBe('unattributed');
    });
  });

  describe('filters', () => {
    it('passes plan, backend, checkout and branch filters to the plan-run leg', async () => {
      await resolver.workstreamTimeline(
        baseInput({
          backend: 'claude',
          checkoutId: 'checkout-1',
          gitBranch: 'main',
          planId: 'plan-1',
          spanKinds: [TimelineSpanKind.PLAN_RUN],
        }),
      );

      const params = query.mock.calls[0]?.[1] ?? [];
      expect(params).toContain('plan-1');
      expect(params).toContain('claude');
      expect(params).toContain('checkout-1');
      expect(params).toContain('main');
    });

    it('skips the scheduled-run leg entirely when a plan filter is set', async () => {
      const result = await resolver.workstreamTimeline(
        baseInput({
          planId: 'plan-1',
          spanKinds: [TimelineSpanKind.SCHEDULED_RUN],
        }),
      );

      expect(query).not.toHaveBeenCalled();
      expect(result.spans).toEqual([]);
      expect(result.truncation[0]?.returned).toBe(0);
    });

    it('composes a readable title for a status change', async () => {
      // The raw external_key is a dedupe discriminator
      // ("status_change:task:<uuid>:COMPLETED:<uuid>"), which is unreadable in
      // a tooltip; the payload holds the actual transition.
      await resolver.workstreamTimeline(
        baseInput({ markerKinds: [TimelineMarkerKind.STATUS_CHANGE] }),
      );

      const sql = query.mock.calls[0]?.[0] ?? '';
      expect(sql).toContain("wa.payload->>'from'");
      expect(sql).toContain("wa.payload->>'to'");
      expect(sql).toContain("wa.payload->>'entity'");
    });

    it('excludes never-touched tasks from the task-updated leg', async () => {
      await resolver.workstreamTimeline(
        baseInput({ markerKinds: [TimelineMarkerKind.TASK_UPDATED] }),
      );

      expect(query.mock.calls[0]?.[0]).toContain(
        't.updated_at <> t.created_at',
      );
    });
  });

  describe('lane grouping', () => {
    it('keys plan-run lanes by backend under BY_BACKEND', async () => {
      query.mockResolvedValue([
        {
          backend: 'cursor',
          branch: 'feat/x',
          checkout_id: 'checkout-1',
          conversation_id: null,
          ends_at: '2026-09-02T01:00:00Z',
          id: 'run-1',
          model: null,
          plan_id: 'plan-1',
          plan_title: 'Plan One',
          starts_at: '2026-09-02T00:00:00Z',
          status: 'COMPLETED',
          title: 'Plan One',
        },
      ]);

      const result = await resolver.workstreamTimeline(
        baseInput({
          grouping: TimelineLaneGrouping.BY_BACKEND,
          spanKinds: [TimelineSpanKind.PLAN_RUN],
        }),
      );

      expect(result.spans[0]?.laneKey).toBe('backend:cursor');
      expect(result.spans[0]?.laneLabel).toBe('cursor');
    });

    it('puts grilling in the skills lane under BY_PLAN', async () => {
      query.mockResolvedValue([
        {
          at: '2026-09-02T00:00:00Z',
          branch: 'feat/x',
          id: 'skill-1',
          plan_id: null,
          plan_title: null,
          task_id: null,
          title: 'feat/x',
          url: null,
        },
      ]);

      const result = await resolver.workstreamTimeline(
        baseInput({ markerKinds: [TimelineMarkerKind.GRILLING] }),
      );

      expect(result.markers[0]?.laneKey).toBe('skills');
    });
  });

  describe('ordering', () => {
    it('returns spans oldest first regardless of leg order', async () => {
      query.mockImplementation((sql) =>
        Promise.resolve(
          sql.includes('plan_runs')
            ? [
                {
                  backend: null,
                  branch: null,
                  checkout_id: null,
                  conversation_id: null,
                  ends_at: '2026-09-05T00:00:00Z',
                  id: 'later',
                  model: null,
                  plan_id: 'plan-1',
                  plan_title: 'Plan One',
                  starts_at: '2026-09-04T00:00:00Z',
                  status: null,
                  title: 'later',
                },
              ]
            : [
                {
                  backend: null,
                  branch: null,
                  checkout_id: null,
                  conversation_id: null,
                  ends_at: '2026-09-02T00:00:00Z',
                  id: 'earlier',
                  model: null,
                  plan_id: 'plan-1',
                  plan_title: 'Plan One',
                  starts_at: '2026-09-01T00:00:00Z',
                  status: null,
                  title: 'earlier',
                },
              ],
        ),
      );

      const result = await resolver.workstreamTimeline(
        baseInput({
          spanKinds: [TimelineSpanKind.PLAN_RUN, TimelineSpanKind.WORK_SESSION],
        }),
      );

      expect(result.spans.map((span) => span.id)).toEqual(['earlier', 'later']);
    });
  });
});
