/**
 * @description GraphQL resolver for GitHub pulls and stats. Wraps GitHubService and GitHubStatsService.
 */

import { cacheControlFromInfo } from '@apollo/cache-control-types';
import { Args, Info, Query, Resolver } from '@nestjs/graphql';
import type { GraphQLResolveInfo } from 'graphql';
import type { ListPullsOptions } from '../github/github.service';
import { GitHubService } from '../github/github.service';
import { GitHubStatsService } from './github-stats.service';
import {
  CommitsPerPrInput,
  GetPullInput,
  GitHubRepoInput,
  LinesAddedDeletedInput,
  ListPullsInput,
  OpenToMergedCycleTimeInput,
  PrCountByLabelInput,
  PrsMergedPerPeriodInput,
  ReviewCycleTimeInput,
} from './github.input';
import { CommitsPerPrRowObject } from './commits-per-pr.object';
import { LinesAddedDeletedRowObject } from './lines-added-deleted.object';
import { OpenPrCountByAuthorObject } from './open-pr-count-by-author.object';
import { OpenToMergedCycleTimeObject } from './open-to-merged-cycle-time.object';
import { PrCountByLabelObject } from './pr-count-by-label.object';
import { PrsMergedPerPeriodObject } from './prs-merged-per-period.object';
import { PrTimeInStateSummaryObject } from './pr-time-in-state-summary.object';
import { ReviewCycleTimeObject } from './review-cycle-time.object';
import { PullListItemObject } from './pull-list-item.object';

/** Sets cache hint when Apollo cache control plugin is present (no-op in unit tests). */
function setCacheHint(
  info: GraphQLResolveInfo | undefined,
  maxAge: number,
): void {
  if (info && 'cacheControl' in info) {
    cacheControlFromInfo(info).setCacheHint({ maxAge });
  }
}

@Resolver()
export class GithubResolver {
  private readonly CACHE_MAX_AGE = 60 * 60; // 1 hour

  constructor(
    private readonly githubService: GitHubService,
    private readonly githubStatsService: GitHubStatsService,
  ) {}

  @Query(() => [PullListItemObject], {
    description: `List pull requests for a repository (GitHub API)`,
  })
  async pulls(
    @Args('input') input: ListPullsInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<PullListItemObject[]> {
    setCacheHint(info, this.CACHE_MAX_AGE);

    const options: ListPullsOptions = {
      base: input.base ?? undefined,
      merged: input.merged ?? undefined,
      state: input.state ?? 'open',
    };

    const results = await this.githubService.listPulls(
      input.owner,
      input.repo,
      options,
    );

    return results;
  }

  @Query(() => Boolean, {
    description: `Whether GITHUB_TOKEN is configured on the server. Boolean only — the token value is never exposed. Used to prompt the user to set GITHUB_TOKEN instead of rendering empty/unauthenticated GitHub stats.`,
  })
  githubTokenConfigured(): boolean {
    return this.githubService.isGithubTokenConfigured();
  }

  @Query(() => PullListItemObject, {
    description: `Get one pull request by repository and PR number (GitHub API)`,
    nullable: true,
  })
  async pull(
    @Args('input') input: GetPullInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<PullListItemObject | null> {
    setCacheHint(info, this.CACHE_MAX_AGE);

    return this.githubService.getPullListItem(
      input.owner,
      input.repo,
      input.number,
    );
  }

  @Query(() => [OpenPrCountByAuthorObject], {
    description: `Open PR count per author for a repository (GitHub stats). Paginates PRs up to 1000 (10 pages); repos with more matching PRs are truncated to the most recent window.`,
  })
  async openPrCountByAuthor(
    @Args('input', { type: () => GitHubRepoInput }) input: GitHubRepoInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<OpenPrCountByAuthorObject[]> {
    setCacheHint(info, this.CACHE_MAX_AGE);

    return this.githubStatsService.getOpenPrCountByAuthor(
      input.owner,
      input.repo,
      input.state,
    );
  }

  @Query(() => [PrTimeInStateSummaryObject], {
    description: `PR time-in-state summary (count and avg days per state: open, closed, merged). Paginates PRs up to 1000 (10 pages); repos with more PRs are truncated to the most recent window.`,
  })
  async prTimeInStateSummary(
    @Args('input', { type: () => GitHubRepoInput }) input: GitHubRepoInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<PrTimeInStateSummaryObject[]> {
    setCacheHint(info, this.CACHE_MAX_AGE);

    return this.githubStatsService.getPrTimeInStateSummary(
      input.owner,
      input.repo,
    );
  }

  @Query(() => [LinesAddedDeletedRowObject], {
    description: `Lines added/deleted by period (week or month) and author for merged PRs. Lists merged PRs across pages up to 1000 (10 pages) then fetches per-PR diff stats; maxPrs caps the detail requests.`,
  })
  async linesAddedDeleted(
    @Args('input', { type: () => LinesAddedDeletedInput })
    input: LinesAddedDeletedInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<LinesAddedDeletedRowObject[]> {
    setCacheHint(info, this.CACHE_MAX_AGE);

    return this.githubStatsService.getLinesAddedDeletedByPeriodOrAuthor(
      input.owner,
      input.repo,
      {
        maxPrs: input.maxPrs ?? undefined,
        period: input.period ?? 'month',
      },
    );
  }

  @Query(() => [OpenToMergedCycleTimeObject], {
    description: `Cycle time for merged PRs: median and P90 of days from open to merged. Optional period buckets by week/month (UTC). Paginates merged PRs up to 1000 (10 pages); older PRs beyond the cap are excluded.`,
  })
  async openToMergedCycleTime(
    @Args('input', { type: () => OpenToMergedCycleTimeInput })
    input: OpenToMergedCycleTimeInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<OpenToMergedCycleTimeObject[]> {
    setCacheHint(info, this.CACHE_MAX_AGE);

    return this.githubStatsService.getOpenToMergedCycleTime(
      input.owner,
      input.repo,
      {
        period: input.period ?? undefined,
      },
    );
  }

  @Query(() => [PrCountByLabelObject], {
    description: `PR counts by label (breakdown by type e.g. bug, feature, docs). Uses Issues API; optional state filter (open/closed/all).`,
  })
  async prCountByLabel(
    @Args('input', { type: () => PrCountByLabelInput })
    input: PrCountByLabelInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<PrCountByLabelObject[]> {
    setCacheHint(info, this.CACHE_MAX_AGE);

    return this.githubStatsService.getPrCountByLabel(input.owner, input.repo, {
      state: input.state ?? 'all',
    });
  }

  @Query(() => [PrsMergedPerPeriodObject], {
    description: `PRs merged per week or month (throughput trend). Buckets by merged_at in UTC. Paginates merged PRs up to 1000 (10 pages); older PRs beyond the cap are excluded.`,
  })
  async prsMergedPerPeriod(
    @Args('input', { type: () => PrsMergedPerPeriodInput })
    input: PrsMergedPerPeriodInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<PrsMergedPerPeriodObject[]> {
    setCacheHint(info, this.CACHE_MAX_AGE);

    return this.githubStatsService.getPrsMergedPerPeriod(
      input.owner,
      input.repo,
      {
        period: input.period,
      },
    );
  }

  @Query(() => [ReviewCycleTimeObject], {
    description: `Review cycle time for merged PRs: median and P90 of days from last CHANGES_REQUESTED to first subsequent APPROVED or merge. Optional period buckets by week/month (UTC). Lists merged PRs across pages up to 1000 (10 pages) and paginates reviews; maxPrs caps the per-PR review requests.`,
  })
  async reviewCycleTime(
    @Args('input', { type: () => ReviewCycleTimeInput })
    input: ReviewCycleTimeInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<ReviewCycleTimeObject[]> {
    setCacheHint(info, this.CACHE_MAX_AGE);

    return this.githubStatsService.getReviewCycleTime(input.owner, input.repo, {
      maxPrs: input.maxPrs ?? undefined,
      period: input.period ?? undefined,
    });
  }

  @Query(() => [CommitsPerPrRowObject], {
    description: `Commits per PR (PR size in commits) for merged PRs. Lists merged PRs across pages up to 1000 (10 pages) and paginates commits per PR; maxPrs caps the per-PR commit-count requests. Optional period bucket (week/month UTC).`,
  })
  async commitsPerPr(
    @Args('input', { type: () => CommitsPerPrInput })
    input: CommitsPerPrInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<CommitsPerPrRowObject[]> {
    setCacheHint(info, this.CACHE_MAX_AGE);

    return this.githubStatsService.getCommitsPerPr(input.owner, input.repo, {
      maxPrs: input.maxPrs ?? undefined,
      period: input.period ?? undefined,
    });
  }
}
