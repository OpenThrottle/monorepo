/**
 * @description GraphQL input for the workstream timeline query: the required
 * window plus optional lane filters and a per-kind allowlist.
 */

import { Field, InputType } from '@nestjs/graphql';

import {
  TIMELINE_LANE_GROUPING,
  TIMELINE_MARKER_KIND,
  TIMELINE_SPAN_KIND,
  TimelineLaneGroupingValue,
  TimelineMarkerKindValue,
  TimelineSpanKindValue,
} from './timeline.enum.ts';

@InputType()
export class WorkstreamTimelineInput {
  @Field(() => String, {
    description: `Filter spans to a single agent driver or tool.`,
    nullable: true,
  })
  driver!: string | null;

  @Field(() => String, {
    description: `Filter to a single repository checkout (UUID).`,
    nullable: true,
  })
  checkoutId!: string | null;

  @Field(() => Date, {
    description: `Start of the window (inclusive).`,
  })
  from!: Date;

  @Field(() => String, {
    description: `Filter to a single git branch. Also scopes the grilling lane, which is how unattributed grilling events (no \`userId\`) are narrowed.`,
    nullable: true,
  })
  gitBranch!: string | null;

  @Field(() => TIMELINE_LANE_GROUPING, {
    description: `How rows are grouped into lanes. Defaults to BY_PLAN.`,
    nullable: true,
  })
  grouping!: TimelineLaneGroupingValue | null;

  @Field(() => [TIMELINE_MARKER_KIND], {
    description: `Marker kinds to include. Omit or pass null for all kinds; an empty list returns no markers.`,
    nullable: true,
  })
  markerKinds!: TimelineMarkerKindValue[] | null;

  @Field(() => String, {
    description: `Filter to a single plan (UUID).`,
    nullable: true,
  })
  planId!: string | null;

  @Field(() => [TIMELINE_SPAN_KIND], {
    description: `Span kinds to include. Omit or pass null for all kinds; an empty list returns no spans.`,
    nullable: true,
  })
  spanKinds!: TimelineSpanKindValue[] | null;

  @Field(() => Date, {
    description: `End of the window (exclusive). Must be after \`from\`, and no more than 90 days later.`,
  })
  to!: Date;
}
