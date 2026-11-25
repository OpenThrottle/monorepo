/**
 * @description GraphQL enums for the workstream timeline: the span kinds (things
 * with duration), the marker kinds (things that happened at an instant), and the
 * lane grouping modes. Kinds double as the `kinds` allowlist on the query input,
 * so turning a lane off narrows the SQL rather than only hiding DOM.
 */

import { registerEnumType } from '@nestjs/graphql';

/**
 * Spans have a start and an end. Two of the three carry measured ends;
 * `PLAN_RUN` never does — see `derivedEnd` on the span object.
 */
export const TIMELINE_SPAN_KIND = {
  PLAN_RUN: 'PLAN_RUN',
  SCHEDULED_RUN: 'SCHEDULED_RUN',
  WORK_SESSION: 'WORK_SESSION',
} as const;

export type TimelineSpanKindKey = keyof typeof TIMELINE_SPAN_KIND;
export type TimelineSpanKindValue =
  (typeof TIMELINE_SPAN_KIND)[TimelineSpanKindKey];

registerEnumType(TIMELINE_SPAN_KIND, {
  description: `Kinds of timeline span (work with a duration).`,
  name: 'TimelineSpanKind',
  valuesMap: {
    PLAN_RUN: {
      description: `A queued plan run (plan_runs). Its end is always derived — the table records no finish timestamp.`,
    },
    SCHEDULED_RUN: {
      description: `A scheduled agent job run (scheduled_agent_job_runs). Carries measured started_at/finished_at.`,
    },
    WORK_SESSION: {
      description: `A work-ledger session (work_sessions). Measured unless still open (ended_at IS NULL).`,
    },
  },
});

/** Markers happened at a single instant. */
export const TIMELINE_MARKER_KIND = {
  GIT_COMMIT: 'GIT_COMMIT',
  GRILLING: 'GRILLING',
  PULL_REQUEST: 'PULL_REQUEST',
  STATUS_CHANGE: 'STATUS_CHANGE',
  TASK_ADDED: 'TASK_ADDED',
  TASK_UPDATED: 'TASK_UPDATED',
} as const;

export type TimelineMarkerKindKey = keyof typeof TIMELINE_MARKER_KIND;
export type TimelineMarkerKindValue =
  (typeof TIMELINE_MARKER_KIND)[TimelineMarkerKindKey];

registerEnumType(TIMELINE_MARKER_KIND, {
  description: `Kinds of timeline marker (work recorded at an instant).`,
  name: 'TimelineMarkerKind',
  valuesMap: {
    GIT_COMMIT: {
      description: 'A git_commit work artifact, keyed on produced_at.',
    },
    GRILLING: {
      description: `A grilling skill invocation (skill_usage_events where skill_name = 'grilling'), keyed on occurred_at. Attributed via \`userId\` when ingest resolved a principal; older rows carry none and fall back to the branch heuristic.`,
    },
    PULL_REQUEST: {
      description: 'A pull_request work artifact, keyed on produced_at.',
    },
    STATUS_CHANGE: {
      description: `A status_change work artifact, keyed on produced_at. Recorded inconsistently — expect a sparse lane.`,
    },
    TASK_ADDED: { description: 'A task was created (tasks.created_at).' },
    TASK_UPDATED: {
      description: `A task was last written (tasks.updated_at). Last write only — tasks carry no status history.`,
    },
  },
});

/** How lanes are keyed. Every kind resolves a lane key under every mode. */
export const TIMELINE_LANE_GROUPING = {
  BY_CHECKOUT: 'BY_CHECKOUT',
  BY_DRIVER: 'BY_DRIVER',
  BY_PLAN: 'BY_PLAN',
} as const;

export type TimelineLaneGroupingKey = keyof typeof TIMELINE_LANE_GROUPING;
export type TimelineLaneGroupingValue =
  (typeof TIMELINE_LANE_GROUPING)[TimelineLaneGroupingKey];

registerEnumType(TIMELINE_LANE_GROUPING, {
  description: `How timeline rows are grouped into lanes.`,
  name: 'TimelineLaneGrouping',
  valuesMap: {
    BY_CHECKOUT: {
      description: 'One lane per repository checkout (falling back to branch).',
    },
    BY_DRIVER: {
      description: 'One lane per agent driver or tool.',
    },
    BY_PLAN: { description: 'One lane per plan. The default.' },
  },
});
