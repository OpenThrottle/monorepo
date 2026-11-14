/**
 * @description GraphQL resolver for GitHub pulls and stats. Wraps GitHubService and GitHubStatsService.
 */

import { Args, Query, Resolver } from '@nestjs/graphql';
import { CacheHint } from '@openthrottle/nestjs-graphql';

import { GitHubService } from '../github/github.service.ts';
import type { ListPullsOptions } from '../github/github.types.ts';
import { CommitsPerPrRowObject } from './commits-per-pr.object.ts';
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
} from './github.input.ts';
import { GitHubStatsService } from './github-stats/github-stats.service.ts';
import {
  GITHUB_CACHE_HINT,
  GITHUB_TOKEN_CONFIGURED_CACHE_HINT,
} from './graphql.constants.ts';
import { LinesAddedDeletedRowObject } from './lines-added-deleted.object.ts';
import { OpenPrCountByAuthorObject } from './open-pr-count-by-author.object.ts';
import { OpenToMergedCycleTimeObject } from './open-to-merged-cycle-time.object.ts';
import { PrCountByLabelObject } from './pr-count-by-label.object.ts';
import { PrTimeInStateSummaryObject } from './pr-time-in-state-summary.object.ts';
import { PrsMergedPerPeriodObject } from './prs-merged-per-period.object.ts';
import { PullListItemObject } from './pull-list-item.object.ts';
import { ReviewCycleTimeObject } from './review-cycle-time.object.ts';

@Resolver()
export class GithubResolver {
  constructor(
    private readonly githubService: GitHubService,
    private readonly githubStatsService: GitHubStatsService,
  ) {}

  @Query(() => [PullListItemObject], {
    description: `List pull requests for a repository (GitHub API)`,
  })
  @CacheHint(GITHUB_CACHE_HINT)
  async pulls(
    @Args('input') input: ListPullsInput,
  ): Promise<PullListItemObject[]> {
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
  @CacheHint(GITHUB_TOKEN_CONFIGURED_CACHE_HINT)
  githubTokenConfigured(): boolean {
    return this.githubService.isGithubTokenConfigured();
  }

  @Query(() => PullListItemObject, {
    description: `Get one pull request by repository and PR number (GitHub API)`,
    nullable: true,
  })
  @CacheHint(GITHUB_CACHE_HINT)
  async pull(
    @Args('input') input: GetPullInput,
  ): Promise<PullListItemObject | null> {
    return this.githubService.getPullListItem(
      input.owner,
      input.repo,
      input.number,
    );
  }

  @Query(() => [OpenPrCountByAuthorObject], {
    description: `Open PR count per author for a repository (GitHub stats). Paginates PRs up to 1000 (10 pages); repos with more matching PRs are truncated to the most recent window.`,
  })
  @CacheHint(GITHUB_CACHE_HINT)
  async openPrCountByAuthor(
    @Args('input', { type: () => GitHubRepoInput }) input: GitHubRepoInput,
  ): Promise<OpenPrCountByAuthorObject[]> {
    return this.githubStatsService.getOpenPrCountByAuthor(
      input.owner,
      input.repo,
      input.state,
    );
  }

  @Query(() => [PrTimeInStateSummaryObject], {
    description: `PR time-in-state summary (count and avg days per state: open, closed, merged). Paginates PRs up to 1000 (10 pages); repos with more PRs are truncated to the most recent window.`,
  })
  @CacheHint(GITHUB_CACHE_HINT)
  async prTimeInStateSummary(
    @Args('input', { type: () => GitHubRepoInput }) input: GitHubRepoInput,
  ): Promise<PrTimeInStateSummaryObject[]> {
    return this.githubStatsService.getPrTimeInStateSummary(
      input.owner,
      input.repo,
    );
  }

  @Query(() => [LinesAddedDeletedRowObject], {
    description: `Lines added/deleted by period (week or month) and author for merged PRs. Lists merged PRs across pages up to 1000 (10 pages) then fetches per-PR diff stats; maxPrs caps the detail requests.`,
  })
  @CacheHint(GITHUB_CACHE_HINT)
  async linesAddedDeleted(
    @Args('input', { type: () => LinesAddedDeletedInput })
    input: LinesAddedDeletedInput,
  ): Promise<LinesAddedDeletedRowObject[]> {
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
  @CacheHint(GITHUB_CACHE_HINT)
  async openToMergedCycleTime(
    @Args('input', { type: () => OpenToMergedCycleTimeInput })
    input: OpenToMergedCycleTimeInput,
  ): Promise<OpenToMergedCycleTimeObject[]> {
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
  @CacheHint(GITHUB_CACHE_HINT)
  async prCountByLabel(
    @Args('input', { type: () => PrCountByLabelInput })
    input: PrCountByLabelInput,
  ): Promise<PrCountByLabelObject[]> {
    return this.githubStatsService.getPrCountByLabel(input.owner, input.repo, {
      state: input.state ?? 'all',
    });
  }

  @Query(() => [PrsMergedPerPeriodObject], {
    description: `PRs merged per week or month (throughput trend). Buckets by merged_at in UTC. Paginates merged PRs up to 1000 (10 pages); older PRs beyond the cap are excluded.`,
  })
  @CacheHint(GITHUB_CACHE_HINT)
  async prsMergedPerPeriod(
    @Args('input', { type: () => PrsMergedPerPeriodInput })
    input: PrsMergedPerPeriodInput,
  ): Promise<PrsMergedPerPeriodObject[]> {
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
  @CacheHint(GITHUB_CACHE_HINT)
  async reviewCycleTime(
    @Args('input', { type: () => ReviewCycleTimeInput })
    input: ReviewCycleTimeInput,
  ): Promise<ReviewCycleTimeObject[]> {
    return this.githubStatsService.getReviewCycleTime(input.owner, input.repo, {
      maxPrs: input.maxPrs ?? undefined,
      period: input.period ?? undefined,
    });
  }

  @Query(() => [CommitsPerPrRowObject], {
    description: `Commits per PR (PR size in commits) for merged PRs. Lists merged PRs across pages up to 1000 (10 pages) and paginates commits per PR; maxPrs caps the per-PR commit-count requests. Optional period bucket (week/month UTC).`,
  })
  @CacheHint(GITHUB_CACHE_HINT)
  async commitsPerPr(
    @Args('input', { type: () => CommitsPerPrInput })
    input: CommitsPerPrInput,
  ): Promise<CommitsPerPrRowObject[]> {
    return this.githubStatsService.getCommitsPerPr(input.owner, input.repo, {
      maxPrs: input.maxPrs ?? undefined,
      period: input.period ?? undefined,
    });
  }
}
