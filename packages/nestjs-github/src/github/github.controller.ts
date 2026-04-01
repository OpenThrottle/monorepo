import { Controller, Get, Param, Query } from '@nestjs/common';
import type { PullListItemDto } from './dto/pull-list-item.dto';
import { type ListPullsOptions, GitHubService } from './github.service';

/** Query param: 'open' | 'closed' | 'all'. */
type StateQuery = 'all' | 'closed' | 'open';

@Controller('github/repos')
export class GitHubController {
  constructor(private readonly githubService: GitHubService) {}

  /**
   * @description List pull requests for a repository. Filter by state (open, closed, all)
   * and optionally by base branch or merged only.
   */
  @Get(':owner/:repo/pulls')
  async listPulls(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('state') state: StateQuery = 'open',
    @Query('base') base?: string,
    @Query('merged') merged?: string,
  ): Promise<PullListItemDto[]> {
    const options: ListPullsOptions = {
      base,
      merged: merged === 'true' ? true : merged === 'false' ? false : undefined,
      state: state ?? 'open',
    };

    return this.githubService.listPulls(owner, repo, options);
  }
}
