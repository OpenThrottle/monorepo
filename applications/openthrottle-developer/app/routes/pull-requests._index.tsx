import * as React from 'react';
import { Link } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Badge, Button, Card } from '@openthrottle/react-router-shadcn';
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
  githubCommitChecksUrl,
  githubCommitUrl,
  githubPullChecksUrl,
  githubPullCommitsUrl,
  githubPullCompareUrl,
  githubPullConversationUrl,
  githubRepoActionsForBranchUrl,
  githubRepoActionsPullRequestRunsUrl,
} from '~/routing/pull-requests/utils/github-pr-links';
import type { Route } from '@/app/routes/+types/pull-requests._index';
import { PullRequestsIntroduction } from '~/routing/pull-requests/components/PullRequestsIntroduction';
import { PullRequestsEmpty } from '~/routing/pull-requests/components/PullRequestsEmpty';
import { parsePullListState } from '~/routing/pull-requests/utils/parsers';
import { PullRequestStats } from '~/routing/pull-requests/components/PullRequestStats';
import { PullRequestsToolbar } from '~/routing/pull-requests/components/PullRequestsToolbar';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Pull requests',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const defaults = getDefaultGithubRepo();
  const url = new URL(args.request.url);

  const ownerParam = url.searchParams.get('owner') ?? defaults.owner;
  const repoParam = url.searchParams.get('repo') ?? defaults.repo;
  const baseTrimmed = url.searchParams.get('base')?.trim() ?? '';
  const authorParam = url.searchParams.get('author')?.trim() ?? '';

  const state = parsePullListState(url.searchParams.get('state'));
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

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Pull Requests | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { filters, listQuery, pulls } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <PullRequestStats />
      <PullRequestsIntroduction />
      <PullRequestsToolbar filters={filters} />

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
              {pull.headSha !== null ? (
                <>
                  <Button asChild={true} size="sm" variant="secondary">
                    <a
                      href={githubCommitChecksUrl(
                        filters.owner,
                        filters.repo,
                        pull.headSha,
                      )}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Checks at SHA
                    </a>
                  </Button>
                  <Button asChild={true} size="sm" variant="outline">
                    <a
                      href={githubCommitUrl(
                        filters.owner,
                        filters.repo,
                        pull.headSha,
                      )}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Head{' '}
                      <span className="font-mono">
                        {pull.headSha.slice(0, 7)}
                      </span>
                    </a>
                  </Button>
                </>
              ) : null}
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

      {pulls.length === 0 ? <PullRequestsEmpty /> : null}
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
