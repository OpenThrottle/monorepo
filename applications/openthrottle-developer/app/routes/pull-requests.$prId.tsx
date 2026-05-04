import * as React from 'react';
import { Link } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Button, Card } from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import { GetPullRequestDetailDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { getDefaultGithubRepo } from '~/global/config/github-default-repo';
import { SITE_TITLE } from '~/global/config/settings';
import {
  githubPullChecksUrl,
  githubPullConversationUrl,
  githubPullFilesUrl,
  githubRepoActionsUrl,
} from '~/routing/pull-requests/utils/github-pr-links';
import type { Route } from '@/app/routes/+types/pull-requests.$prId';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Details',
  links: (_match) => [{ children: 'Pull requests', to: '/pull-requests' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const defaults = getDefaultGithubRepo();
  const url = new URL(args.request.url);
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

  const listSearchParams = new URLSearchParams();
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

  return (
    <GlobalScreen>
      <nav className="text-muted-foreground mb-4 text-sm">
        <Link className="hover:text-foreground" to="/pull-requests">
          Pull requests
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">
          {pull ? `#${pull.number}` : '…'}
        </span>
      </nav>

      {!pull ? (
        <>
          <OpenThrottleEmptyState
            description="This PR was not found for the selected owner and repo. Try another filter from the list or open the repository on GitHub."
            title="Pull request not found"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild={true} size="sm" variant="outline">
              <Link
                to={
                  listQuery === ''
                    ? '/pull-requests'
                    : `/pull-requests?${listQuery}`
                }
                viewTransition={true}
              >
                Back to list
              </Link>
            </Button>
            <Button asChild={true} size="sm" variant="outline">
              <a
                href={`https://github.com/${owner}/${repo}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open repo on GitHub
              </a>
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-xl text-highlight font-semibold leading-snug">
              {pull.title}{' '}
              <span className="text-muted-foreground font-normal">
                #{pull.number}
              </span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              <span className="font-medium text-foreground">{pull.author}</span>
              {' · '}
              State {pull.state} · Created{' '}
              {formatDate(pull.createdAt, 'MM/dd/yyyy')} — updated{' '}
              {formatDate(pull.updatedAt, 'MM/dd/yyyy')}
              {pull.mergedAt ? (
                <> · Merged {formatDate(pull.mergedAt, 'MM/dd/yyyy')}</>
              ) : null}
            </p>
          </div>

          <Card className="p-4 lg:p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Merge &amp; CI on GitHub
            </h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Status checks and workflows live on GitHub. Use Checks for
              required CI and failing jobs; Actions lists workflow runs for this
              repo.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild={true} size="sm" variant="default">
                <a
                  href={githubPullChecksUrl(owner, repo, pull.number)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Open checks (CI)
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubPullConversationUrl(owner, repo, pull.number)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Conversation
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubPullFilesUrl(owner, repo, pull.number)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Files changed
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubRepoActionsUrl(owner, repo)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Repo actions
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="ghost">
                <a
                  href={pull.htmlUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Primary GitHub URL
                </a>
              </Button>
            </div>
          </Card>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild={true} size="sm" variant="outline">
              <Link
                to={
                  listQuery === ''
                    ? '/pull-requests'
                    : `/pull-requests?${listQuery}`
                }
                viewTransition={true}
              >
                Back to list
              </Link>
            </Button>
          </div>
        </>
      )}
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
