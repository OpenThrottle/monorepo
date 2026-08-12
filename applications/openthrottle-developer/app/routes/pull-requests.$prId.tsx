import * as React from 'react';
import { MiddlewareFunction } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { authMiddleware } from '@openthrottle/react-router-auth';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GetPullRequestDetailDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { getDefaultGithubRepo } from '~/global/config/github-default-repo';
import { SITE_TITLE } from '~/global/config/settings';
import { PullRequestDetail } from '~/routing/pull-requests/components/PullRequestDetail';
import { PullRequestNotFound } from '~/routing/pull-requests/components/PullRequestNotFound';
import type { Route } from '@/app/routes/+types/pull-requests.$prId';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => `#${match.params.prId}`,
  links: (_match) => [{ children: 'Pull Requests', to: '/pull-requests' }],
};

export const middleware: MiddlewareFunction[] = [authMiddleware];

export const loader = async (args: Route.LoaderArgs) => {
  const defaults = getDefaultGithubRepo();
  const url = args.url;
  const owner = url.searchParams.get('owner') ?? defaults.owner;
  const repo = url.searchParams.get('repo') ?? defaults.repo;
  const raw = args.params.prId;
  const number = Number.parseInt(raw ?? '', 10);

  if (!Number.isFinite(number)) {
    throw new Response('Invalid pull request number', { status: 400 });
  }

  const result = await executeGraphqlWithAuth(
    args.request,
    GetPullRequestDetailDocument,
    { input: { number, owner, repo } },
  );

  const listSearchParams = new URLSearchParams(url.searchParams);
  listSearchParams.set('owner', owner);
  listSearchParams.set('repo', repo);
  const listQuery = listSearchParams.toString();

  return {
    listQuery,
    owner,
    pull: result.pull,
    repo,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const pull = args.loaderData?.pull;
  const title = pull?.title
    ? `PR #${pull.number}: ${pull.title} | ${SITE_TITLE}`
    : `Pull request | ${SITE_TITLE}`;

  return [{ title }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { listQuery, owner, pull, repo } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      {!pull ? (
        <PullRequestNotFound listQuery={listQuery} owner={owner} repo={repo} />
      ) : (
        <PullRequestDetail
          listQuery={listQuery}
          owner={owner}
          pull={pull}
          repo={repo}
        />
      )}
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
