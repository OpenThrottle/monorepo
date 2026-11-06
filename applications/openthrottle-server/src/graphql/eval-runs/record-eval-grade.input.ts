/**
 * @description GraphQL input type for recording one grader's verdict on a trial. Re-recording the
 * same (trial, grader id, grader version) replaces the earlier row.
 */

import { Field, Float, ID, InputType } from '@nestjs/graphql';

@InputType()
export class RecordEvalGradeInput {
  @Field(() => String, {
    description: `Judge-cache key. Omit for graders that are not cached.`,
    nullable: true,
  })
  cacheKey!: string | null;

  @Field(() => Float, {
    description: `Cost of grading in USD. Omit for code graders and unpriceable judges.`,
    nullable: true,
  })
  costUsd!: number | null;

  @Field(() => String, {
    description: `Why the grader could not decide. Required when the verdict is error, and only then.`,
    nullable: true,
  })
  errorReason!: string | null;

  @Field(() => String, {
    description: `Evidence the grader quoted, as a JSON string. Omit for an error verdict.`,
    nullable: true,
  })
  evidenceJson!: string | null;

  @Field(() => String, { description: `Stable id of the grader.` })
  graderId!: string;

  @Field(() => String, {
    description: `What produced the grade: code, judge or human.`,
  })
  graderKind!: string;

  @Field(() => String, { description: `Grader version.` })
  graderVersion!: string;

  @Field(() => String, {
    description: `Driver that ran the judge.`,
    nullable: true,
  })
  judgeDriver!: string | null;

  @Field(() => String, {
    description: `Model that ran the judge. Required when graderKind is judge.`,
    nullable: true,
  })
  judgeModel!: string | null;

  @Field(() => String, {
    description: `Version or snapshot of the judge model when known.`,
    nullable: true,
  })
  judgeModelVersion!: string | null;

  @Field(() => ID, { description: `Trial being graded.` })
  trialId!: string;

  @Field(() => String, { description: `pass, fail or error.` })
  verdict!: string;
}
