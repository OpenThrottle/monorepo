/**
 * @description GraphQL ObjectTypes for the workstream timeline: spans (duration),
 * markers (instants), per-kind truncation flags, and the result envelope.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TimelineMarkerKind, TimelineSpanKind } from './timeline.enum';

@ObjectType()
export class TimelineSpanObject {
  @Field(() => String, {
    description: `Execution backend / tool name / driver id, when the source carries one.`,
    nullable: true,
  })
  backend!: string | null;

  @Field(() => String, {
    description: `Git branch the work ran on, when known.`,
    nullable: true,
  })
  branch!: string | null;

  @Field(() => String, {
    description: `Repository checkout (UUID) the work ran in, when known.`,
    nullable: true,
  })
  checkoutId!: string | null;

  @Field(() => String, {
    description: `Agent conversation (UUID) behind this span, when known.`,
    nullable: true,
  })
  conversationId!: string | null;

  @Field(() => Boolean, {
    description: `TRUE when \`endsAt\` was inferred rather than recorded — always for PLAN_RUN (plan_runs has no finish column), and for any still-open session or run. Render it distinctly; a derived end must never read as a measured one.`,
  })
  derivedEnd!: boolean;

  @Field(() => Date, {
    description: `End of the span. See \`derivedEnd\` before treating it as a measured finish.`,
  })
  endsAt!: Date;

  @Field(() => String, { description: `Stable row id.` })
  id!: string;

  @Field(() => TimelineSpanKind)
  kind!: TimelineSpanKind;

  @Field(() => String, {
    description: `Lane this span belongs to under the requested grouping.`,
  })
  laneKey!: string;

  @Field(() => String, {
    description: `Human-legible lane label for \`laneKey\`.`,
  })
  laneLabel!: string;

  @Field(() => String, {
    description: `Model that did the work, when known.`,
    nullable: true,
  })
  model!: string | null;

  @Field(() => String, {
    description: `Plan (UUID) this span is attributed to, when it has one.`,
    nullable: true,
  })
  planId!: string | null;

  @Field(() => Date, { description: `Start of the span.` })
  startsAt!: Date;

  @Field(() => String, {
    description: `Source-specific status (plan run status, scheduled run status).`,
    nullable: true,
  })
  status!: string | null;

  @Field(() => String, { description: `One-line summary for the tooltip.` })
  title!: string;
}

@ObjectType()
export class TimelineMarkerObject {
  @Field(() => Date, { description: `When the marker happened.` })
  at!: Date;

  @Field(() => String, {
    description: `Git branch attributed to this marker, when known.`,
    nullable: true,
  })
  branch!: string | null;

  @Field(() => String, { description: `Stable row id.` })
  id!: string;

  @Field(() => TimelineMarkerKind)
  kind!: TimelineMarkerKind;

  @Field(() => String, {
    description: `Lane this marker belongs to under the requested grouping.`,
  })
  laneKey!: string;

  @Field(() => String, {
    description: `Human-legible lane label for \`laneKey\`.`,
  })
  laneLabel!: string;

  @Field(() => String, {
    description: `Plan (UUID) this marker is attributed to, when it has one.`,
    nullable: true,
  })
  planId!: string | null;

  @Field(() => String, {
    description: `Task (UUID) this marker is attributed to, when it has one.`,
    nullable: true,
  })
  taskId!: string | null;

  @Field(() => String, { description: `One-line summary for the tooltip.` })
  title!: string;

  @Field(() => String, {
    description: `External deep-link target (commit or pull request URL), when the payload carries one.`,
    nullable: true,
  })
  url!: string | null;
}

@ObjectType()
export class TimelineTruncationObject {
  @Field(() => Int, {
    description: `Rows actually returned for this kind.`,
  })
  returned!: number;

  @Field(() => Boolean, {
    description: `TRUE when the per-kind cap was hit and rows in range were withheld. Say "showing first N" rather than implying completeness.`,
  })
  truncated!: boolean;
}

@ObjectType()
export class TimelineKindTruncationObject extends TimelineTruncationObject {
  @Field(() => String, {
    description: `The span or marker kind this entry describes.`,
  })
  kind!: string;
}

@ObjectType()
export class WorkstreamTimelineResultObject {
  @Field(() => Date, { description: `Echo of the requested window start.` })
  from!: Date;

  @Field(() => [TimelineMarkerObject], {
    description: `Instant markers in the window, oldest first.`,
  })
  markers!: TimelineMarkerObject[];

  @Field(() => [TimelineSpanObject], {
    description: `Duration spans overlapping the window, oldest first.`,
  })
  spans!: TimelineSpanObject[];

  @Field(() => Date, { description: `Echo of the requested window end.` })
  to!: Date;

  @Field(() => [TimelineKindTruncationObject], {
    description: `Per-kind row counts and truncation flags, one entry per requested kind.`,
  })
  truncation!: TimelineKindTruncationObject[];
}
