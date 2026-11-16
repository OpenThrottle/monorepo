import { Injectable } from '@nestjs/common';
import { GitHubService } from '@openthrottle/nestjs-github';

import { FORGE_KIND } from '../source-control.constants.ts';
import type {
  ForgeCommitDetail,
  ForgeCommitSummary,
  ForgeCompareStatus,
  ForgePullRequest,
  SourceControlForge,
} from '../source-control.types.ts';
import { splitFullName } from '../source-control.utils.ts';

const GITHUB_WEB_BASE = 'https://github.com';

/**
 * @description The GitHub forge: {@link SourceControlForge} over `GitHubService`. Pure delegation
 * plus `fullName` splitting; every behaviour (404 → null, timeouts, rate-limit handling) stays in
 * `GitHubService`, where its tests already pin it.
 */
@Injectable()
export class GitHubForgeService implements SourceControlForge {
  readonly kind = FORGE_KIND.GITHUB;

  constructor(private readonly githubService: GitHubService) {}

  commitUrl(fullName: string, sha: string): string {
    return `${GITHUB_WEB_BASE}/${fullName}/commit/${sha}`;
  }

  async compareCommits(
    fullName: string,
    base: string,
    head: string,
  ): Promise<ForgeCompareStatus | null> {
    const { name, owner } = this.split(fullName);

    return this.githubService.compareCommitStatus(owner, name, base, head);
  }

  async findPullRequestForBranch(
    fullName: string,
    branch: string,
  ): Promise<ForgePullRequest | null> {
    const { name, owner } = this.split(fullName);
    const pulls = await this.githubService.listPulls(owner, name, {
      head: branch,
      state: 'all',
    });
    // GitHub lists newest first; the newest request is the one a re-opened branch is on now.
    const newest = pulls[0];

    if (newest === undefined) return null;

    return this.getPullRequest(fullName, newest.number);
  }

  async getCommit(
    fullName: string,
    sha: string,
  ): Promise<ForgeCommitDetail | null> {
    const { name, owner } = this.split(fullName);

    return this.githubService.getCommitDetail(owner, name, sha);
  }

  async getDefaultBranch(fullName: string): Promise<string | null> {
    const { name, owner } = this.split(fullName);

    return this.githubService.getDefaultBranch(owner, name);
  }

  async getMergeCommitShaForCommit(
    fullName: string,
    sha: string,
  ): Promise<string | null> {
    const { name, owner } = this.split(fullName);

    return this.githubService.getMergeCommitShaForCommit(owner, name, sha);
  }

  async getPullRequest(
    fullName: string,
    number: number,
  ): Promise<ForgePullRequest> {
    const { name, owner } = this.split(fullName);
    const pull = await this.githubService.getPullDetail(owner, name, number);

    return {
      mergeCommitSha: pull.mergeCommitSha,
      mergedAt: pull.mergedAt,
      number: pull.number,
      state: pull.state === 'closed' ? 'closed' : 'open',
    };
  }

  async listCommits(
    fullName: string,
    branch: string,
    stopAtSha: string | null,
  ): Promise<ForgeCommitSummary[]> {
    const { name, owner } = this.split(fullName);

    return this.githubService.listCommits(owner, name, branch, stopAtSha);
  }

  pullRequestUrl(fullName: string, number: number): string {
    return `${GITHUB_WEB_BASE}/${fullName}/pull/${number}`;
  }

  /** GitHub repos are exactly `owner/name`; anything else is a caller bug worth surfacing. */
  private split(fullName: string): { name: string; owner: string } {
    const parts = splitFullName(fullName);

    if (parts == null || parts.owner.includes('/')) {
      throw new Error(`Not a GitHub owner/repo: '${fullName}'`);
    }

    return parts;
  }
}
