/**
 * @description GraphQL ObjectType for an eval grade. Mirrors the eval_grades entity from
 * @openthrottle/nestjs-repositories (migration 147); `evidence` is exposed as a JSON string.
 */

import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('EvalGrade', {
  description: `One grader's verdict on one trial, with the grader and judge identity it was produced by.`,
})
export class EvalGradeObject {
  @Field(() => String, {
    description: `Judge-cache key. Null for graders that are not cached.`,
    nullable: true,
  })
  cacheKey!: string | null;

  @Field(() => Float, {
    description: `Cost of grading in USD. Null for code graders and unpriceable judges.`,
    nullable: true,
  })
  costUsd!: number | null;

  @Field(() => Date, { description: `When the grade was recorded.` })
  createdAt!: Date;

  @Field(() => String, {
    description: `Why the grader could not decide. Set exactly when the verdict is error.`,
    nullable: true,
  })
  errorReason!: string | null;

  @Field(() => String, {
    description: `Evidence the grader quoted, serialized with JSON.stringify. Null for an error verdict.`,
    nullable: true,
  })
  evidenceJson!: string | null;

  @Field(() => String, { description: `Stable id of the grader.` })
  graderId!: string;

  @Field(() => String, {
    description: `What produced the grade: code, judge or human.`,
  })
  graderKind!: string;

  @Field(() => String, {
    description: `Grader version; it changes whenever the check changes.`,
  })
  graderVersion!: string;

  @Field(() => ID, { description: `Grade id.` })
  id!: string;

  @Field(() => String, {
    description: `Driver that ran the judge. Null unless the grader is a judge.`,
    nullable: true,
  })
  judgeDriver!: string | null;

  @Field(() => String, {
    description: `Model that ran the judge. Set for every judge grade.`,
    nullable: true,
  })
  judgeModel!: string | null;

  @Field(() => String, {
    description: `Version or snapshot of the judge model when known.`,
    nullable: true,
  })
  judgeModelVersion!: string | null;

  @Field(() => ID, { description: `Trial that was graded.` })
  trialId!: string;

  @Field(() => String, {
    description: `pass, fail, or error (the grader itself could not decide; excluded from pass rates).`,
  })
  verdict!: string;
}
