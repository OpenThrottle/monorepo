/**
 * @description GraphQL input for the workstream timeline query: the required
 * window plus optional lane filters and a per-kind allowlist.
 */

import { Field, InputType } from '@nestjs/graphql';
import {
  TimelineLaneGrouping,
  TimelineMarkerKind,
  TimelineSpanKind,
} from './timeline.enum';

@InputType()
export class WorkstreamTimelineInput {
  @Field(() => String, {
    description: `Filter spans to a single execution backend / tool / driver.`,
    nullable: true,
  })
  backend!: string | null;

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
    description: `Filter to a single git branch. Also scopes the grilling lane, which has no user_id to scope by.`,
    nullable: true,
  })
  gitBranch!: string | null;

  @Field(() => TimelineLaneGrouping, {
    description: `How rows are grouped into lanes. Defaults to BY_PLAN.`,
    nullable: true,
  })
  grouping!: TimelineLaneGrouping | null;

  @Field(() => [TimelineMarkerKind], {
    description: `Marker kinds to include. Omit or pass null for all kinds; an empty list returns no markers.`,
    nullable: true,
  })
  markerKinds!: TimelineMarkerKind[] | null;

  @Field(() => String, {
    description: `Filter to a single plan (UUID).`,
    nullable: true,
  })
  planId!: string | null;

  @Field(() => [TimelineSpanKind], {
    description: `Span kinds to include. Omit or pass null for all kinds; an empty list returns no spans.`,
    nullable: true,
  })
  spanKinds!: TimelineSpanKind[] | null;

  @Field(() => Date, {
    description: `End of the window (exclusive). Must be after \`from\`, and no more than 90 days later.`,
  })
  to!: Date;
}
