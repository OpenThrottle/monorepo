/**
 * @description GraphQL ObjectTypes for a paired comparison of two eval runs. Computed by
 * compareEvalReports in @openthrottle/agentic-evals (McNemar on per-case outcomes).
 */

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

import { EvalRunReportObject } from './eval-run-report.object.ts';

@ObjectType('EvalComparisonWarning', {
  description: `A reason the two runs are not strictly comparable.`,
})
export class EvalComparisonWarningObject {
  @Field(() => String, {
    description: `dataset_differs, auth_mode_differs, k_differs or no_shared_cases.`,
  })
  code!: string;

  @Field(() => String, { description: `A sentence for a reader.` })
  message!: string;
}

@ObjectType('EvalMcNemar', {
  description: `McNemar's test on the cases where the two runs disagree.`,
})
export class EvalMcNemarObject {
  @Field(() => Int, {
    description: `Cases that passed in the baseline and failed in the candidate: got worse.`,
  })
  b!: number;

  @Field(() => Int, {
    description: `Cases that failed in the baseline and passed in the candidate: got better.`,
  })
  c!: number;

  @Field(() => String, { description: `exact or chi_square.` })
  method!: string;

  @Field(() => Float, { description: `Two-sided p-value.` })
  pValue!: number;
}

@ObjectType('EvalRunComparison', {
  description: `A candidate run against a baseline run over the cases both have an outcome for.`,
})
export class EvalRunComparisonObject {
  @Field(() => EvalRunReportObject, {
    description: `The baseline run's report.`,
  })
  base!: EvalRunReportObject;

  @Field(() => EvalRunReportObject, {
    description: `The candidate run's report.`,
  })
  candidate!: EvalRunReportObject;

  @Field(() => [ID], {
    description: `Cases that failed in the baseline and pass in the candidate.`,
  })
  improvedCaseIds!: string[];

  @Field(() => EvalMcNemarObject, {
    description: `McNemar's test. Null when no case is shared.`,
    nullable: true,
  })
  mcnemar!: EvalMcNemarObject | null;

  @Field(() => [ID], {
    description: `Cases that passed in the baseline and fail in the candidate.`,
  })
  regressedCaseIds!: string[];

  @Field(() => Int, {
    description: `Cases both runs have a counted outcome for.`,
  })
  sharedCases!: number;

  @Field(() => [EvalComparisonWarningObject], {
    description: `Why the comparison may not mean what it appears to.`,
  })
  warnings!: EvalComparisonWarningObject[];
}
