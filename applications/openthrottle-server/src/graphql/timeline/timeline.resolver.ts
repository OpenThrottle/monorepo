/**
 * @description Resolver for the workstream timeline. Reuses the activity
 * resolver's aggregation idiom — raw SQL through PlansService's repository
 * manager, one bounded leg per kind, merged and sorted in JS — widened from
 * three legs to nine and re-shaped into spans + markers.
 */

import { PlansService } from '@openthrottle/nestjs-repositories';
import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  TimelineLaneGrouping,
  TimelineMarkerKind,
  TimelineSpanKind,
} from './timeline.enum';
import {
  TimelineKindTruncationObject,
  TimelineMarkerObject,
  TimelineSpanObject,
  WorkstreamTimelineResultObject,
} from './timeline.object';
import { resolveTimelineLane } from './timeline-lanes';
import { WorkstreamTimelineInput } from './timeline.input';

/**
 * Rows read per kind. The chart buckets markers past a density threshold, so
 * more rows than this buy nothing a viewer can read — they only cost memory and
 * DOM. Truncation is reported per kind so the UI can say "showing first N"
 * rather than implying the lane is complete.
 */
const TIMELINE_ROWS_PER_KIND = 500;

/**
 * Widest window the query will serve, in days.
 *
 * The plan cited `activity-range-bounds.test.ts` as precedent here; it is not —
 * that covers per-leg row-depth capping, and `activityByDateRange` validates no
 * width at all. This bound is new, and deliberately tighter than
 * `activityByDate`'s 1–365 `daysBack` clamp: nine legs over a year is a
 * different proposition from three, and no timeline preset exceeds 30 days.
 */
const TIMELINE_MAX_WINDOW_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type SpanRow = {
  backend: string | null;
  branch: string | null;
  checkout_id: string | null;
  conversation_id: string | null;
  ends_at: string | null;
  id: string;
  model: string | null;
  plan_id: string | null;
  plan_title: string | null;
  starts_at: string;
  status: string | null;
  title: string;
};

type MarkerRow = {
  at: string;
  branch: string | null;
  id: string;
  plan_id: string | null;
  plan_title: string | null;
  task_id: string | null;
  title: string;
  url: string | null;
};

type QueryFn = <T>(sql: string, params?: unknown[]) => Promise<T>;

// @authz-stance: authenticated-only (matches the activity module it extends)
@Resolver()
export class TimelineResolver {
  constructor(private readonly plansService: PlansService) {}

  @Query(() => WorkstreamTimelineResultObject, {
    description: `The workstream over a time window: run/session spans plus instant markers (task added, task updated, grilling, commit, PR, status change). Window is required and capped at ${TIMELINE_MAX_WINDOW_DAYS} days. Rows are capped per kind; read \`truncation\` before presenting a lane as complete.`,
  })
  async workstreamTimeline(
    @Args('input', { type: () => WorkstreamTimelineInput })
    input: WorkstreamTimelineInput,
  ): Promise<WorkstreamTimelineResultObject> {
    const fromIso = new Date(input.from).toISOString();
    const toIso = new Date(input.to).toISOString();

    this.assertWindow(fromIso, toIso);

    const grouping = input.grouping ?? TimelineLaneGrouping.BY_PLAN;
    const spanKinds = input.spanKinds ?? Object.values(TimelineSpanKind);
    const markerKinds = input.markerKinds ?? Object.values(TimelineMarkerKind);

    const repo = this.plansService.getRepository();
    const q: QueryFn = (sql, params) => repo.manager.query(sql, params);

    const [spanLegs, markerLegs] = await Promise.all([
      Promise.all(
        spanKinds.map(async (kind) => ({
          kind,
          rows: await this.fetchSpanRows(q, kind, fromIso, toIso, input),
        })),
      ),
      Promise.all(
        markerKinds.map(async (kind) => ({
          kind,
          rows: await this.fetchMarkerRows(q, kind, fromIso, toIso, input),
        })),
      ),
    ]);

    const spans: TimelineSpanObject[] = [];
    const markers: TimelineMarkerObject[] = [];
    const truncation: TimelineKindTruncationObject[] = [];

    // `now` is resolved once so every open span in one response shares an end;
    // resolving per row would render sibling live runs at different lengths.
    const now = new Date();

    for (const leg of spanLegs) {
      for (const row of leg.rows) {
        spans.push(this.toSpan(leg.kind, row, grouping, now));
      }
      truncation.push(this.toTruncation(leg.kind, leg.rows.length));
    }

    for (const leg of markerLegs) {
      for (const row of leg.rows) {
        markers.push(this.toMarker(leg.kind, row, grouping));
      }
      truncation.push(this.toTruncation(leg.kind, leg.rows.length));
    }

    spans.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    markers.sort((a, b) => a.at.getTime() - b.at.getTime());

    const result = new WorkstreamTimelineResultObject();
    result.from = new Date(fromIso);
    result.markers = markers;
    result.spans = spans;
    result.to = new Date(toIso);
    result.truncation = truncation;

    return result;
  }

  private assertWindow(fromIso: string, toIso: string): void {
    const from = new Date(fromIso).getTime();
    const to = new Date(toIso).getTime();

    if (Number.isNaN(from) || Number.isNaN(to)) {
      throw new Error('from and to must be valid timestamps');
    }
    if (to <= from) throw new Error('to must be after from');
    if (to - from > TIMELINE_MAX_WINDOW_DAYS * MS_PER_DAY) {
      throw new Error(
        `Window may not exceed ${TIMELINE_MAX_WINDOW_DAYS} days; narrow the range`,
      );
    }
  }

  private async fetchMarkerRows(
    q: QueryFn,
    kind: TimelineMarkerKind,
    fromIso: string,
    toIso: string,
    input: WorkstreamTimelineInput,
  ): Promise<MarkerRow[]> {
    const planFilter = input.planId ?? null;

    if (kind === TimelineMarkerKind.TASK_ADDED) {
      return q<MarkerRow[]>(
        `SELECT t.id, t.created_at AS at, t.plan_id, p.title AS plan_title,
                t.id AS task_id, t.title, NULL::text AS branch, NULL::text AS url
           FROM tasks t
           JOIN plans p ON p.id = t.plan_id
          WHERE t.created_at >= $1::timestamptz AND t.created_at < $2::timestamptz
            AND ($3::uuid IS NULL OR t.plan_id = $3::uuid)
          ORDER BY t.created_at DESC
          LIMIT $4`,
        [fromIso, toIso, planFilter, TIMELINE_ROWS_PER_KIND],
      );
    }

    if (kind === TimelineMarkerKind.TASK_UPDATED) {
      // `updated_at = created_at` means the task was never touched after
      // creation. Emitting those would stack a second glyph on every
      // TASK_ADDED marker and read as activity that never happened.
      return q<MarkerRow[]>(
        `SELECT t.id, t.updated_at AS at, t.plan_id, p.title AS plan_title,
                t.id AS task_id, t.title, NULL::text AS branch, NULL::text AS url
           FROM tasks t
           JOIN plans p ON p.id = t.plan_id
          WHERE t.updated_at >= $1::timestamptz AND t.updated_at < $2::timestamptz
            AND t.updated_at <> t.created_at
            AND ($3::uuid IS NULL OR t.plan_id = $3::uuid)
          ORDER BY t.updated_at DESC
          LIMIT $4`,
        [fromIso, toIso, planFilter, TIMELINE_ROWS_PER_KIND],
      );
    }

    if (kind === TimelineMarkerKind.GRILLING) {
      // No user_id on this table (migration 084). `git_branch` / `cwd` is the
      // only scoping available, matching what /usage already does — the UI
      // discloses that the lane is heuristic rather than user-scoped.
      return q<MarkerRow[]>(
        `SELECT sue.id, sue.occurred_at AS at, NULL::uuid AS plan_id,
                NULL::text AS plan_title, NULL::uuid AS task_id,
                sue.git_branch AS branch, NULL::text AS url,
                COALESCE(sue.git_branch, sue.cwd, 'grilling') AS title
           FROM skill_usage_events sue
          WHERE sue.skill_name = 'grilling'
            AND sue.occurred_at >= $1::timestamptz AND sue.occurred_at < $2::timestamptz
            AND ($3::text IS NULL OR sue.git_branch = $3::text)
          ORDER BY sue.occurred_at DESC
          LIMIT $4`,
        [fromIso, toIso, input.gitBranch ?? null, TIMELINE_ROWS_PER_KIND],
      );
    }

    // The three work_artifacts kinds share one shape. DISTINCT ON (wa.id) with
    // the task-subject-first ORDER BY is lifted straight from the activity
    // resolver's commits leg: a session with several subjects must still yield
    // exactly one marker per artifact.
    const artifactType = {
      [TimelineMarkerKind.GIT_COMMIT]: 'git_commit',
      [TimelineMarkerKind.PULL_REQUEST]: 'pull_request',
      [TimelineMarkerKind.STATUS_CHANGE]: 'status_change',
    }[kind];

    return q<MarkerRow[]>(
      `SELECT * FROM (
         SELECT DISTINCT ON (wa.id)
                wa.id,
                wa.produced_at AS at,
                wss.plan_id,
                p.title AS plan_title,
                wss.task_id,
                -- A status_change carries no message, and its external_key is
                -- a dedupe discriminator ("status_change:task:<uuid>:COMPLETED:<uuid>")
                -- that is unreadable in a tooltip. Its payload does hold the
                -- readable transition, so compose one.
                COALESCE(
                  wa.message,
                  CASE WHEN wa.type = 'status_change'
                       THEN COALESCE(wa.payload->>'entity', 'item')
                            || ': ' || COALESCE(wa.payload->>'from', '?')
                            || ' → ' || COALESCE(wa.payload->>'to', '?')
                  END,
                  wa.external_key
                ) AS title,
                wa.payload->>'url' AS url,
                NULL::text AS branch
           FROM work_artifacts wa
           JOIN work_session_subjects wss ON wss.session_id = wa.session_id
           JOIN plans p ON p.id = wss.plan_id
          WHERE wa.type = $3
            AND wa.produced_at >= $1::timestamptz AND wa.produced_at < $2::timestamptz
            AND ($4::uuid IS NULL OR wss.plan_id = $4::uuid)
          ORDER BY wa.id, (wss.task_id IS NULL)
       ) deduped
       ORDER BY deduped.at DESC
       LIMIT $5`,
      [fromIso, toIso, artifactType, planFilter, TIMELINE_ROWS_PER_KIND],
    );
  }

  private async fetchSpanRows(
    q: QueryFn,
    kind: TimelineSpanKind,
    fromIso: string,
    toIso: string,
    input: WorkstreamTimelineInput,
  ): Promise<SpanRow[]> {
    // Overlap, not containment: a run that started before the window and is
    // still going is exactly the row this view exists to show.
    if (kind === TimelineSpanKind.PLAN_RUN) {
      return q<SpanRow[]>(
        `SELECT pr.id,
                pr.created_at AS starts_at,
                GREATEST(pr.updated_at, COALESCE(pr.last_heartbeat_at, pr.updated_at)) AS ends_at,
                pr.plan_id, p.title AS plan_title, p.title AS title,
                pr.execution_backend AS backend, pr.model, pr.branch,
                pr.checkout_id, pr.status, NULL::uuid AS conversation_id
           FROM plan_runs pr
           JOIN plans p ON p.id = pr.plan_id
          WHERE pr.created_at < $2::timestamptz
            AND GREATEST(pr.updated_at, COALESCE(pr.last_heartbeat_at, pr.updated_at)) >= $1::timestamptz
            AND ($3::uuid IS NULL OR pr.plan_id = $3::uuid)
            AND ($4::text IS NULL OR pr.execution_backend = $4::text)
            AND ($5::uuid IS NULL OR pr.checkout_id = $5::uuid)
            AND ($6::text IS NULL OR pr.branch = $6::text)
          ORDER BY pr.created_at DESC
          LIMIT $7`,
        [
          fromIso,
          toIso,
          input.planId ?? null,
          input.backend ?? null,
          input.checkoutId ?? null,
          input.gitBranch ?? null,
          TIMELINE_ROWS_PER_KIND,
        ],
      );
    }

    if (kind === TimelineSpanKind.WORK_SESSION) {
      // An open session (ended_at IS NULL) overlaps any window that has already
      // started, so COALESCE its end to the window end for the range predicate
      // and let `toSpan` clamp the rendered end to now.
      return q<SpanRow[]>(
        `SELECT DISTINCT ON (ws.id)
                ws.id, ws.started_at AS starts_at, ws.ended_at AS ends_at,
                wss.plan_id, p.title AS plan_title,
                ws.tool_name AS backend, ws.model,
                COALESCE(ws.summary, ws.tool_name) AS title,
                NULL::text AS branch, NULL::uuid AS checkout_id,
                ws.closed_by AS status, ws.conversation_id
           FROM work_sessions ws
           LEFT JOIN work_session_subjects wss ON wss.session_id = ws.id
           LEFT JOIN plans p ON p.id = wss.plan_id
          WHERE ws.started_at < $2::timestamptz
            AND COALESCE(ws.ended_at, $2::timestamptz) >= $1::timestamptz
            AND ($3::uuid IS NULL OR wss.plan_id = $3::uuid)
            AND ($4::text IS NULL OR ws.tool_name = $4::text)
          ORDER BY ws.id, (wss.task_id IS NULL)
          LIMIT $5`,
        [
          fromIso,
          toIso,
          input.planId ?? null,
          input.backend ?? null,
          TIMELINE_ROWS_PER_KIND,
        ],
      );
    }

    // Scheduled runs are the one span kind with measured lifecycle timestamps
    // (migration 082): started_at AND finished_at. They are not plan-scoped, so
    // a planId filter excludes them entirely rather than matching nothing.
    if (input.planId != null && input.planId !== '') return [];

    return q<SpanRow[]>(
      `SELECT sr.id,
              COALESCE(sr.started_at, sr.created_at) AS starts_at,
              sr.finished_at AS ends_at,
              NULL::uuid AS plan_id, NULL::text AS plan_title,
              j.name AS title, sr.driver_id AS backend, sr.model,
              NULL::text AS branch, j.repository_checkout_id AS checkout_id,
              sr.status, NULL::uuid AS conversation_id
         FROM scheduled_agent_job_runs sr
         JOIN scheduled_agent_jobs j ON j.id = sr.scheduled_agent_job_id
        WHERE COALESCE(sr.started_at, sr.created_at) < $2::timestamptz
          AND COALESCE(sr.finished_at, $2::timestamptz) >= $1::timestamptz
          AND ($3::text IS NULL OR sr.driver_id = $3::text)
          AND ($4::uuid IS NULL OR j.repository_checkout_id = $4::uuid)
        ORDER BY COALESCE(sr.started_at, sr.created_at) DESC
        LIMIT $5`,
      [
        fromIso,
        toIso,
        input.backend ?? null,
        input.checkoutId ?? null,
        TIMELINE_ROWS_PER_KIND,
      ],
    );
  }

  private toMarker(
    kind: TimelineMarkerKind,
    row: MarkerRow,
    grouping: TimelineLaneGrouping,
  ): TimelineMarkerObject {
    const lane = resolveTimelineLane(
      grouping,
      {
        branch: row.branch,
        planId: row.plan_id,
        planTitle: row.plan_title,
      },
      kind === TimelineMarkerKind.GRILLING ? 'skills' : null,
    );

    const marker = new TimelineMarkerObject();
    marker.at = new Date(row.at);
    marker.branch = row.branch;
    marker.id = row.id;
    marker.kind = kind;
    marker.laneKey = lane.key;
    marker.laneLabel = lane.label;
    marker.planId = row.plan_id;
    marker.taskId = row.task_id;
    marker.title = row.title;
    marker.url = row.url;

    return marker;
  }

  private toSpan(
    kind: TimelineSpanKind,
    row: SpanRow,
    grouping: TimelineLaneGrouping,
    now: Date,
  ): TimelineSpanObject {
    const lane = resolveTimelineLane(
      grouping,
      {
        backend: row.backend,
        branch: row.branch,
        checkoutId: row.checkout_id,
        planId: row.plan_id,
        planTitle: row.plan_title,
      },
      kind === TimelineSpanKind.SCHEDULED_RUN ? 'scheduled' : null,
    );

    // A PLAN_RUN end is *always* derived — plan_runs records created_at,
    // updated_at and last_heartbeat_at, and none of those is a finish. The other
    // two kinds are measured unless the row is still open.
    const isOpen = row.ends_at == null;
    const derivedEnd = kind === TimelineSpanKind.PLAN_RUN || isOpen;
    const endsAt = isOpen ? now : new Date(row.ends_at ?? row.starts_at);

    const span = new TimelineSpanObject();
    span.backend = row.backend;
    span.branch = row.branch;
    span.checkoutId = row.checkout_id;
    span.conversationId = row.conversation_id;
    span.derivedEnd = derivedEnd;
    span.endsAt = endsAt;
    span.id = row.id;
    span.kind = kind;
    span.laneKey = lane.key;
    span.laneLabel = lane.label;
    span.model = row.model;
    span.planId = row.plan_id;
    span.startsAt = new Date(row.starts_at);
    span.status = row.status;
    span.title = row.title;

    return span;
  }

  private toTruncation(
    kind: string,
    returned: number,
  ): TimelineKindTruncationObject {
    const entry = new TimelineKindTruncationObject();
    entry.kind = kind;
    entry.returned = returned;
    entry.truncated = returned >= TIMELINE_ROWS_PER_KIND;

    return entry;
  }
}
