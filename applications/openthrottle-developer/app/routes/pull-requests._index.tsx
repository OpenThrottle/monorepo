import * as React from 'react';
import { Form, Link } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  GetPullRequestsDocument,
  type ListPullsInput,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { getDefaultGithubRepo } from '~/global/config/github-default-repo';
import { SITE_TITLE } from '~/global/config/settings';
import {
  githubPullChecksUrl,
  githubPullCommitsUrl,
  githubPullCompareUrl,
  githubPullConversationUrl,
  githubRepoActionsForBranchUrl,
  githubRepoActionsPullRequestRunsUrl,
} from '~/routing/pull-requests/utils/github-pr-links';
import type { Route } from '@/app/routes/+types/pull-requests._index';

const parsePullListState = (raw: string | null): 'all' | 'closed' | 'open' => {
  if (raw === 'all' || raw === 'closed') {
    return raw;
  }

  return 'open';
};

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Pull requests',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const defaults = getDefaultGithubRepo();
  const url = new URL(args.request.url);
  const ownerParam = url.searchParams.get('owner') ?? defaults.owner;
  const repoParam = url.searchParams.get('repo') ?? defaults.repo;
  const state = parsePullListState(url.searchParams.get('state'));
  const baseTrimmed = url.searchParams.get('base')?.trim() ?? '';
  const authorParam = url.searchParams.get('author')?.trim() ?? '';
  const authorFilterLower = authorParam.toLowerCase();
  const authorExact =
    authorParam !== '' && url.searchParams.get('authorExact') === '1';
  const mergedParam = url.searchParams.get('merged');
  const mergedFilter: boolean | undefined =
    mergedParam === 'true' ? true : mergedParam === 'false' ? false : undefined;

  const input: ListPullsInput = {
    owner: ownerParam,
    repo: repoParam,
    state,
    ...(baseTrimmed !== '' ? { base: baseTrimmed } : {}),
    ...(mergedFilter !== undefined ? { merged: mergedFilter } : {}),
  };

  const { pulls } = await executeGraphqlWithAuth(
    args.request,
    GetPullRequestsDocument,
    { input },
  );

  const filteredPulls =
    authorFilterLower === ''
      ? pulls
      : pulls.filter((item) => {
          const login = item.author.toLowerCase();

          return authorExact
            ? login === authorFilterLower
            : login.includes(authorFilterLower);
        });

  const listSearchParams = new URLSearchParams();
  listSearchParams.set('owner', ownerParam);
  listSearchParams.set('repo', repoParam);
  if (state !== 'open') {
    listSearchParams.set('state', state);
  }
  if (baseTrimmed !== '') {
    listSearchParams.set('base', baseTrimmed);
  }
  if (authorParam !== '') {
    listSearchParams.set('author', authorParam);
  }

  if (authorExact && authorParam !== '') {
    listSearchParams.set('authorExact', '1');
  }
  if (mergedFilter === true) {
    listSearchParams.set('merged', 'true');
  }
  if (mergedFilter === false) {
    listSearchParams.set('merged', 'false');
  }

  return {
    filters: {
      author: authorParam,
      authorExact,
      base: baseTrimmed,
      merged: mergedFilter,
      owner: ownerParam,
      repo: repoParam,
      state,
    },
    listQuery: listSearchParams.toString(),
    pulls: filteredPulls,
  };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Pull Requests | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { filters, listQuery, pulls } = loaderData;

  return (
    <GlobalScreen>
      <p className="text-muted-foreground text-sm mb-2 max-w-2xl">
        <span className="text-foreground font-medium font-mono">
          {filters.owner}/{filters.repo}
        </span>
        <span className="mx-2 text-border">·</span>
        {pulls.length} PR{pulls.length === 1 ? '' : 's'} with current filters
      </p>
      <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
        Filter by <span className="font-medium text-foreground">owner</span>,{' '}
        <span className="font-medium text-foreground">repo</span>, and{' '}
        <span className="font-medium text-foreground">author</span> when
        debugging CI or the merge queue. Each card links to GitHub{' '}
        <span className="font-medium text-foreground">Checks</span> (aggregated
        status), <span className="font-medium text-foreground">Commits</span>{' '}
        (per-SHA checks), and{' '}
        <span className="font-medium text-foreground">Actions</span> (workflow
        runs) using the PR number and branch refs when available.
      </p>

      <Form
        className="mb-8 flex flex-col gap-4 rounded-lg border border-border p-4"
        method="get"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pr-filter-owner">Owner</Label>
            <Input
              defaultValue={filters.owner}
              id="pr-filter-owner"
              name="owner"
              placeholder="org or user"
              type="text"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pr-filter-repo">Repo</Label>
            <Input
              defaultValue={filters.repo}
              id="pr-filter-repo"
              name="repo"
              placeholder="repository name"
              type="text"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pr-filter-state">State</Label>
            <select
              className="border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue={filters.state}
              id="pr-filter-state"
              name="state"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pr-filter-base">Base branch (optional)</Label>
            <Input
              defaultValue={filters.base}
              id="pr-filter-base"
              name="base"
              placeholder="e.g. main"
              type="text"
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="pr-filter-author">Author (optional)</Label>
            <Input
              defaultValue={filters.author}
              id="pr-filter-author"
              name="author"
              placeholder="GitHub login"
              type="text"
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                className="border-input accent-primary h-4 w-4 rounded"
                defaultChecked={filters.authorExact}
                disabled={filters.author === ''}
                name="authorExact"
                type="checkbox"
                value="1"
              />
              Exact login match (when author is set)
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pr-filter-merged">Merged (optional)</Label>
            <select
              className="border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue={
                filters.merged === true
                  ? 'true'
                  : filters.merged === false
                    ? 'false'
                    : ''
              }
              id="pr-filter-merged"
              name="merged"
            >
              <option value="">Any</option>
              <option value="true">Merged only</option>
              <option value="false">Not merged</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" type="submit" variant="default">
            Apply filters
          </Button>
          <Button asChild={true} size="sm" variant="outline">
            <Link to="/pull-requests">Reset</Link>
          </Button>
        </div>
      </Form>

      <div className="grid grid-cols-1 gap-4 lg:gap-8">
        {pulls.map((pull) => (
          <Card className="p-4 lg:p-8" key={pull.number}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-md font-semibold leading-snug">
                  <Link
                    className="hover:underline"
                    to={
                      listQuery === ''
                        ? `/pull-requests/${pull.number}`
                        : `/pull-requests/${pull.number}?${listQuery}`
                    }
                    viewTransition={true}
                  >
                    {pull.title}
                  </Link>{' '}
                  <span className="text-muted-foreground font-normal">
                    #{pull.number}
                  </span>
                </h2>
                <p className="text-muted-foreground mt-2 text-xs">
                  <span className="font-medium text-foreground">
                    {pull.author}
                  </span>
                  {' · '}
                  Created {formatDate(pull.createdAt, 'MM/dd/yyyy')} — updated{' '}
                  {formatDate(pull.updatedAt, 'MM/dd/yyyy')}
                </p>
                {pull.baseRef !== null || pull.headRef !== null ? (
                  <p className="text-muted-foreground mt-1 font-mono text-xs">
                    {pull.baseRef !== null ? pull.baseRef : '—'} ←{' '}
                    {pull.headRef !== null ? pull.headRef : '—'}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                <Badge
                  variant={pull.state === 'open' ? 'default' : 'secondary'}
                >
                  {pull.state}
                </Badge>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button asChild={true} size="sm" variant="outline">
                <Link to={`/pull-requests/${pull.number}?${listQuery}`}>
                  In portal
                </Link>
              </Button>
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubPullConversationUrl(
                    filters.owner,
                    filters.repo,
                    pull.number,
                  )}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  GitHub PR
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="default">
                <a
                  href={githubPullChecksUrl(
                    filters.owner,
                    filters.repo,
                    pull.number,
                  )}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Checks (CI)
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubPullCommitsUrl(
                    filters.owner,
                    filters.repo,
                    pull.number,
                  )}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Commits
                </a>
              </Button>
              {pull.baseRef !== null && pull.headRef !== null ? (
                <Button asChild={true} size="sm" variant="outline">
                  <a
                    href={githubPullCompareUrl(
                      filters.owner,
                      filters.repo,
                      pull.baseRef,
                      pull.headRef,
                    )}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Compare base…head
                  </a>
                </Button>
              ) : null}
              {pull.headRef !== null ? (
                <Button asChild={true} size="sm" variant="outline">
                  <a
                    href={githubRepoActionsForBranchUrl(
                      filters.owner,
                      filters.repo,
                      pull.headRef,
                    )}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Actions (branch)
                  </a>
                </Button>
              ) : null}
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubRepoActionsPullRequestRunsUrl(
                    filters.owner,
                    filters.repo,
                  )}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Actions (PR runs)
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="ghost">
                <a
                  href={pull.htmlUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  html_url
                </a>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {pulls.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-sm">
          No pull requests match these filters. Try another repo or clear the
          author filter.
        </p>
      ) : null}
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
