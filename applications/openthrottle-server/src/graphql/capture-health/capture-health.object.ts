import { Field, ObjectType } from '@nestjs/graphql';

/**
 * @description GraphQL ObjectType for the captureHealth query: when telemetry
 * from one (stream, source) pair last arrived.
 */
@ObjectType()
export class CaptureHealthRowObject {
  @Field(() => Date, {
    description: `Server receipt time of the newest row for this (stream, source).`,
  })
  lastCapturedAt!: Date;

  @Field(() => String, {
    description: `Capturing tool, e.g. claude-code, cursor, codex; unknown when the row carries no source.`,
  })
  source!: string;

  @Field(() => String, {
    description: `Ingest stream: skill_events, skill_outcomes or token_usage.`,
  })
  stream!: string;
}
