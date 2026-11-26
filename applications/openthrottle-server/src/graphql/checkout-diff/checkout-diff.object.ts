/**
 * @description GraphQL ObjectTypes for the checkout diff: the changed-file list against the base
 * branch, and the patch of one file. Hand-written @ObjectType classes; expected failures (not a
 * git repo, checkout gone) come back as `available: false` + `reason`, not as errors.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

import type { CheckoutDiffFileStatusValue } from './checkout-diff.enum.ts';
import { CHECKOUT_DIFF_FILE_STATUS } from './checkout-diff.enum.ts';

@ObjectType({
  description: `One file that differs from the checkout's base branch.`,
})
export class CheckoutDiffFileObject {
  @Field(() => Int, { description: `Lines added; 0 for a binary file.` })
  additions!: number;

  @Field(() => Boolean, {
    description: `True when git treats the file as binary (no patch).`,
  })
  binary!: boolean;

  @Field(() => Int, { description: `Lines removed; 0 for a binary file.` })
  deletions!: number;

  @Field(() => String, { description: `Path relative to the checkout root.` })
  path!: string;

  @Field(() => String, {
    description: `Where a renamed file used to live; null otherwise.`,
    nullable: true,
  })
  previousPath!: string | null;

  @Field(() => CHECKOUT_DIFF_FILE_STATUS)
  status!: CheckoutDiffFileStatusValue;
}

@ObjectType({
  description: `The pull request open (or last seen) for the checkout's branch, when the forge knows one.`,
})
export class CheckoutDiffPullRequestObject {
  @Field(() => Int)
  number!: number;

  @Field(() => String, {
    description: `'open', 'merged' or 'closed'. Draft status is not tracked.`,
  })
  state!: string;

  @Field(() => String, { description: `The pull request's URL on its forge.` })
  url!: string;
}

@ObjectType({
  description: `A checkout's changes against its base branch: committed work since the merge-base, uncommitted edits and untracked files.`,
})
export class CheckoutDiffObject {
  @Field(() => Int, {
    description: `Total lines added across the listed files.`,
  })
  additions!: number;

  @Field(() => Boolean, {
    description: `False when no diff could be computed; see reason.`,
  })
  available!: boolean;

  @Field(() => String, {
    description: `The base branch ref the diff is measured from (e.g. origin/main).`,
    nullable: true,
  })
  baseRef!: string | null;

  @Field(() => Int, {
    description: `Total lines removed across the listed files.`,
  })
  deletions!: number;

  @Field(() => [CheckoutDiffFileObject])
  files!: CheckoutDiffFileObject[];

  @Field(() => Boolean, {
    description: `True when more files changed than are listed.`,
  })
  filesTruncated!: boolean;

  @Field(() => String, {
    description: `The checked-out branch; null when HEAD is detached.`,
    nullable: true,
  })
  headBranch!: string | null;

  @Field(() => CheckoutDiffPullRequestObject, {
    description: `The branch's pull request; null when none is known or the forge could not be asked.`,
    nullable: true,
  })
  pullRequest!: CheckoutDiffPullRequestObject | null;

  @Field(() => String, {
    description: `Why the diff is unavailable; null when it is.`,
    nullable: true,
  })
  reason!: string | null;
}

@ObjectType({
  description: `The unified patch of one file of a checkout diff.`,
})
export class CheckoutFileDiffObject {
  @Field(() => Boolean, {
    description: `False when no patch could be produced; see reason.`,
  })
  available!: boolean;

  @Field(() => Boolean, {
    description: `True for a binary file: the patch is empty.`,
  })
  binary!: boolean;

  @Field(() => String, { description: `Unified diff text, capped at 200 KB.` })
  patch!: string;

  @Field(() => String)
  path!: string;

  @Field(() => String, {
    description: `Why the patch is unavailable; null when it is.`,
    nullable: true,
  })
  reason!: string | null;

  @Field(() => Boolean, {
    description: `True when the patch was cut at the size cap.`,
  })
  truncated!: boolean;
}
