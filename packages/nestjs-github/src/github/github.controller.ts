import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import type { PullListItemDto } from './dto/pull-list-item.dto';
import { type ListPullsOptions, GitHubService } from './github.service';

/** Query param: 'open' | 'closed' | 'all'. */
type StateQuery = 'all' | 'closed' | 'open';

/** Accepted `state` query values; validated to reject typos / injection. */
const VALID_STATES: ReadonlySet<string> = new Set(['all', 'closed', 'open']);

/**
 * Parses the optional `merged` query param. Accepts only 'true' / 'false'
 * (case-insensitive); any other non-empty value is a client error rather than
 * being silently treated as "no filter".
 */
function parseMergedQuery(merged?: string): boolean | undefined {
  if (merged === undefined || merged === '') return undefined;
  const normalized = merged.toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new BadRequestException(
    `Invalid 'merged' query value '${merged}'; expected 'true' or 'false'`,
  );
}

/**
 * Public REST surface for listing repository pull requests, kept alongside the
 * equivalent `pulls` GraphQL query so non-GraphQL clients (e.g. the Cortex UI
 * shape documented on {@link PullListItemDto}) can read PRs. Sits behind the
 * server's global auth guard. Query params are validated here so malformed
 * input fails with a 400 rather than being coerced silently.
 */
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
    const resolvedState = state ?? 'open';
    if (!VALID_STATES.has(resolvedState)) {
      throw new BadRequestException(
        `Invalid 'state' query value '${resolvedState}'; expected 'open', 'closed', or 'all'`,
      );
    }

    const options: ListPullsOptions = {
      base,
      merged: parseMergedQuery(merged),
      state: resolvedState,
    };

    return this.githubService.listPulls(owner, repo, options);
  }
}
