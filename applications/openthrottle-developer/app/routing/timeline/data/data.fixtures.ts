/**
 * @description A deterministic timeline fixture. The plan asks for a view that
 * renders correctly without a server round-trip, and every span/marker layout
 * test needs the same rows, so both read this one set.
 *
 * All timestamps are relative to {@link FIXTURE_WINDOW_TO} so the fixture stays
 * inside its own window no matter when it is read. It deliberately contains a
 * three-deep overlap, a derived end, an open span, a span clipped by the window
 * start, and a tight marker cluster — the cases the chart must not get wrong.
 */

import { TimelineMarkerKind, TimelineSpanKind } from '~/__generated__/graphql';
import type { TimelineMarker, TimelineSpan } from '../types';

const HOUR = 60 * 60 * 1000;

export const FIXTURE_WINDOW_TO = new Date('2026-09-05T00:00:00.000Z');
export const FIXTURE_WINDOW_FROM = new Date(
  FIXTURE_WINDOW_TO.getTime() - 7 * 24 * HOUR,
);

/** Hours before the window end, as an ISO string. */
const hoursAgo = (hours: number): string =>
  new Date(FIXTURE_WINDOW_TO.getTime() - hours * HOUR).toISOString();

export const TIMELINE_FIXTURE_SPANS: readonly TimelineSpan[] = [
  // Three overlapping runs in one lane — the case the whole view exists for.
  {
    backend: 'claude',
    branch: 'loop/timeline-beta',
    checkoutId: 'checkout-1',
    conversationId: null,
    derivedEnd: true,
    endsAt: hoursAgo(20),
    id: 'run-a',
    kind: TimelineSpanKind.PlanRun,
    laneKey: 'plan:plan-1',
    laneLabel: 'Beta /timeline',
    model: 'claude-opus-5',
    planId: 'plan-1',
    startsAt: hoursAgo(26),
    status: 'COMPLETED',
    title: 'Beta /timeline',
  },
  {
    backend: 'cursor',
    branch: 'loop/timeline-beta',
    checkoutId: 'checkout-1',
    conversationId: null,
    derivedEnd: true,
    endsAt: hoursAgo(18),
    id: 'run-b',
    kind: TimelineSpanKind.PlanRun,
    laneKey: 'plan:plan-1',
    laneLabel: 'Beta /timeline',
    model: 'claude-sonnet-5',
    planId: 'plan-1',
    startsAt: hoursAgo(22),
    status: 'FAILED',
    title: 'Beta /timeline',
  },
  {
    backend: 'claude-code',
    branch: null,
    checkoutId: null,
    conversationId: 'conversation-1',
    derivedEnd: false,
    endsAt: hoursAgo(19),
    id: 'session-a',
    kind: TimelineSpanKind.WorkSession,
    laneKey: 'plan:plan-1',
    laneLabel: 'Beta /timeline',
    model: 'claude-opus-5',
    planId: 'plan-1',
    startsAt: hoursAgo(21),
    status: 'explicit',
    title: 'Wired the timeline query',
  },
  // Starts before the window — must render an edge indicator, not be dropped.
  {
    backend: 'claude',
    branch: 'main',
    checkoutId: 'checkout-1',
    conversationId: null,
    derivedEnd: true,
    endsAt: hoursAgo(160),
    id: 'run-clipped',
    kind: TimelineSpanKind.PlanRun,
    laneKey: 'plan:plan-2',
    laneLabel: 'Lint promotion',
    model: null,
    planId: 'plan-2',
    startsAt: new Date(FIXTURE_WINDOW_FROM.getTime() - 6 * HOUR).toISOString(),
    status: 'COMPLETED',
    title: 'Lint promotion',
  },
  // Still open — end is clamped to now and flagged derived.
  {
    backend: 'claude-code',
    branch: null,
    checkoutId: null,
    conversationId: null,
    derivedEnd: true,
    endsAt: hoursAgo(0),
    id: 'session-open',
    kind: TimelineSpanKind.WorkSession,
    laneKey: 'unattributed',
    laneLabel: 'Unattributed',
    model: null,
    planId: null,
    startsAt: hoursAgo(2),
    status: null,
    title: 'openthrottle-mcp',
  },
  {
    backend: 'claude',
    branch: null,
    checkoutId: null,
    conversationId: null,
    derivedEnd: false,
    endsAt: hoursAgo(46),
    id: 'scheduled-a',
    kind: TimelineSpanKind.ScheduledRun,
    laneKey: 'scheduled',
    laneLabel: 'Scheduled jobs',
    model: null,
    planId: null,
    startsAt: hoursAgo(47),
    status: 'succeeded',
    title: 'Nightly docs ingest',
  },
];

export const TIMELINE_FIXTURE_MARKERS: readonly TimelineMarker[] = [
  // A task added while run-a was already in flight — the exact reading the
  // plan asks the chart to make legible.
  {
    at: hoursAgo(24),
    branch: null,
    id: 'task-1',
    kind: TimelineMarkerKind.TaskAdded,
    laneKey: 'plan:plan-1',
    laneLabel: 'Beta /timeline',
    planId: 'plan-1',
    taskId: 'task-1',
    title: 'Render spans with real overlap stacking',
    url: null,
  },
  {
    at: hoursAgo(19.5),
    branch: null,
    id: 'task-2',
    kind: TimelineMarkerKind.TaskUpdated,
    laneKey: 'plan:plan-1',
    laneLabel: 'Beta /timeline',
    planId: 'plan-1',
    taskId: 'task-2',
    title: 'Add the timeline GraphQL query',
    url: null,
  },
  // A tight cluster: three artifacts within minutes, which must bucket.
  {
    at: hoursAgo(18.05),
    branch: null,
    id: 'commit-1',
    kind: TimelineMarkerKind.GitCommit,
    laneKey: 'plan:plan-1',
    laneLabel: 'Beta /timeline',
    planId: 'plan-1',
    taskId: 'task-2',
    title: 'feat: add the workstreamTimeline query',
    url: null,
  },
  {
    at: hoursAgo(18.03),
    branch: null,
    id: 'commit-2',
    kind: TimelineMarkerKind.GitCommit,
    laneKey: 'plan:plan-1',
    laneLabel: 'Beta /timeline',
    planId: 'plan-1',
    taskId: 'task-2',
    title: 'test: cover the derived-end rule',
    url: null,
  },
  {
    at: hoursAgo(18.01),
    branch: null,
    id: 'pr-1',
    kind: TimelineMarkerKind.PullRequest,
    laneKey: 'plan:plan-1',
    laneLabel: 'Beta /timeline',
    planId: 'plan-1',
    taskId: null,
    title: 'Beta /timeline',
    url: 'https://github.com/OpenThrottle/monorepo/pull/1',
  },
  {
    at: hoursAgo(30),
    branch: 'loop/timeline-beta',
    id: 'grilling-1',
    kind: TimelineMarkerKind.Grilling,
    laneKey: 'skills',
    laneLabel: 'Skills',
    planId: null,
    taskId: null,
    title: 'loop/timeline-beta',
    url: null,
  },
];
