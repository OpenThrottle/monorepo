/**
 * @description GraphQL input types for GitHub queries. Single input argument for pulls and stats queries.
 */

import { Field, InputType, Int } from '@nestjs/graphql';
import type { ListPullsOptions } from '../github/github.service';

/** Shared owner/repo input for openPrCountByAuthor and prTimeInStateSummary. */
@InputType()
export class GitHubRepoInput {
  @Field(() => String, {
    description: `Repository owner (e.g. GitHub username or org)`,
  })
  owner!: string;

  @Field(() => String, {
    description: `Repository name`,
  })
  repo!: string;

  @Field(() => String, {
    description: `Filter by state: open, closed, or all`,
  })
  state!: ListPullsOptions['state'];
}

@InputType()
export class ListPullsInput {
  @Field(() => String, {
    description: `Filter by base branch`,
    nullable: true,
  })
  base!: string | null;

  @Field(() => Boolean, {
    description: `Filter by merged (true/false); omit for no filter`,
    nullable: true,
  })
  merged!: boolean | null;

  @Field(() => String, {
    description: `Repository owner (e.g. GitHub username or org)`,
  })
  owner!: string;

  @Field(() => String, {
    description: `Repository name`,
  })
  repo!: string;

  @Field(() => String, {
    description: `Filter by state: open, closed, or all`,
    nullable: true,
  })
  state!: 'all' | 'closed' | 'open' | null;
}

@InputType()
export class GetPullInput {
  @Field(() => Int, {
    description: `Pull request number`,
  })
  number!: number;

  @Field(() => String, {
    description: `Repository owner (e.g. GitHub username or org)`,
  })
  owner!: string;

  @Field(() => String, {
    description: `Repository name`,
  })
  repo!: string;
}

/** Period bucket for lines-added/deleted aggregation. */
export type LinesAddedDeletedPeriodInput = 'month' | 'week';

/** Period bucket for open-to-merged cycle time (optional). */
export type OpenToMergedCycleTimePeriodInput = 'month' | 'week';

@InputType()
export class OpenToMergedCycleTimeInput {
  @Field(() => String, {
    description: `Repository owner (e.g. GitHub username or org)`,
  })
  owner!: string;

  @Field(() => String, {
    description: `Bucket by week (YYYY-Www) or month (YYYY-MM); omit for repo-wide summary.`,
    nullable: true,
  })
  period!: OpenToMergedCycleTimePeriodInput | null;

  @Field(() => String, {
    description: `Repository name`,
  })
  repo!: string;
}

@InputType()
export class LinesAddedDeletedInput {
  @Field(() => Int, {
    description: `Max merged PRs to fetch for diff stats (default 100); caps API calls.`,
    nullable: true,
  })
  maxPrs!: number | null;

  @Field(() => String, {
    description: `Repository owner (e.g. GitHub username or org)`,
  })
  owner!: string;

  @Field(() => String, {
    description: `Bucket by week (YYYY-Www) or month (YYYY-MM); default month.`,
    nullable: true,
  })
  period!: LinesAddedDeletedPeriodInput | null;

  @Field(() => String, {
    description: `Repository name`,
  })
  repo!: string;
}

/** State filter for PR counts by label (open, closed, or all). */
export type PrCountByLabelStateInput = 'all' | 'closed' | 'open';

@InputType()
export class PrCountByLabelInput {
  @Field(() => String, {
    description: `Repository owner (e.g. GitHub username or org)`,
  })
  owner!: string;

  @Field(() => String, {
    description: `Repository name`,
  })
  repo!: string;

  @Field(() => String, {
    description: `Filter PRs by state: open, closed, or all (default).`,
    nullable: true,
  })
  state!: PrCountByLabelStateInput | null;
}

/** Period bucket for PRs merged per week/month. */
export type PrsMergedPerPeriodInputPeriod = 'month' | 'week';

/** Period bucket for review cycle time (optional). */
export type ReviewCycleTimePeriodInput = 'month' | 'week';

@InputType()
export class ReviewCycleTimeInput {
  @Field(() => Int, {
    description: `Max merged PRs to fetch reviews for (default 100); caps API calls.`,
    nullable: true,
  })
  maxPrs!: number | null;

  @Field(() => String, {
    description: `Repository owner (e.g. GitHub username or org)`,
  })
  owner!: string;

  @Field(() => String, {
    description: `Bucket by week (YYYY-Www) or month (YYYY-MM); omit for repo-wide summary.`,
    nullable: true,
  })
  period!: ReviewCycleTimePeriodInput | null;

  @Field(() => String, {
    description: `Repository name`,
  })
  repo!: string;
}

@InputType()
export class PrsMergedPerPeriodInput {
  @Field(() => String, {
    description: `Repository owner (e.g. GitHub username or org)`,
  })
  owner!: string;

  @Field(() => String, {
    description: `Period bucket: week (YYYY-Www) or month (YYYY-MM) in UTC.`,
  })
  period!: PrsMergedPerPeriodInputPeriod;

  @Field(() => String, {
    description: `Repository name`,
  })
  repo!: string;
}

/** Period bucket for commits per PR (optional). */
export type CommitsPerPrPeriodInput = 'month' | 'week';

@InputType()
export class CommitsPerPrInput {
  @Field(() => Int, {
    description: `Max merged PRs to fetch commit count for (default 100); caps API calls.`,
    nullable: true,
  })
  maxPrs!: number | null;

  @Field(() => String, {
    description: `Repository owner (e.g. GitHub username or org)`,
  })
  owner!: string;

  @Field(() => String, {
    description: `Bucket by week (YYYY-Www) or month (YYYY-MM); omit for no period.`,
    nullable: true,
  })
  period!: CommitsPerPrPeriodInput | null;

  @Field(() => String, {
    description: `Repository name`,
  })
  repo!: string;
}
