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
  githubCommitChecksUrl,
  githubCommitUrl,
  githubPullChecksUrl,
  githubPullCommitsUrl,
  githubPullCompareUrl,
  githubPullConversationUrl,
  githubPullFilesUrl,
  githubRepoActionsForBranchUrl,
  githubRepoActionsForPullRequestHeadRefUrl,
  githubRepoActionsForPullRequestMergeRefUrl,
  githubRepoActionsPullRequestRunsUrl,
  githubRepoActionsUrl,
  githubRepoWorkflowsDirUrl,
} from '~/routing/pull-requests/utils/github-pr-links';
import type { Route } from '@/app/routes/+types/pull-requests.$prId';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.params.prId,
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
    <GlobalScreen>
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
            <h1 className="text-xl text-accent font-semibold leading-snug">
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
            {pull.baseRef !== null || pull.headRef !== null ? (
              <p className="text-muted-foreground mt-2 font-mono text-sm">
                Branches:{' '}
                <span className="text-foreground">
                  {pull.baseRef !== null ? pull.baseRef : '—'}
                </span>{' '}
                ←{' '}
                <span className="text-foreground">
                  {pull.headRef !== null ? pull.headRef : '—'}
                </span>
              </p>
            ) : null}
          </div>

          <Card className="p-4 lg:p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Merge &amp; CI on GitHub
            </h2>
            <p className="text-muted-foreground mb-4 text-sm">
              CI conclusions are not mirrored here; use the links below to drill
              into GitHub Checks (rollup + required rules), per-commit status at
              the head SHA when available, Actions runs scoped to this PR or
              branch, and workflow sources.
            </p>

            <h3 className="text-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
              Checks and commit status
            </h3>
            <div className="mb-6 flex flex-wrap gap-2">
              <Button asChild={true} size="sm" variant="default">
                <a
                  href={githubPullChecksUrl(owner, repo, pull.number)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Checks tab (CI rollup)
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubPullCommitsUrl(owner, repo, pull.number)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Commits (per-SHA checks)
                </a>
              </Button>
              {pull.headSha !== null ? (
                <>
                  <Button asChild={true} size="sm" variant="secondary">
                    <a
                      href={githubCommitChecksUrl(owner, repo, pull.headSha)}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Checks at head SHA
                    </a>
                  </Button>
                  <Button asChild={true} size="sm" variant="outline">
                    <a
                      href={githubCommitUrl(owner, repo, pull.headSha)}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Head commit{' '}
                      <span className="font-mono">
                        {pull.headSha.slice(0, 7)}
                      </span>
                    </a>
                  </Button>
                </>
              ) : null}
            </div>

            <h3 className="text-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
              Workflow runs (Actions)
            </h3>
            <div className="mb-6 flex flex-wrap gap-2">
              {pull.headRef !== null ? (
                <Button asChild={true} size="sm" variant="outline">
                  <a
                    href={githubRepoActionsForBranchUrl(
                      owner,
                      repo,
                      pull.headRef,
                    )}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Actions (branch name)
                  </a>
                </Button>
              ) : null}
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubRepoActionsForPullRequestHeadRefUrl(
                    owner,
                    repo,
                    pull.number,
                  )}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Actions (refs/pull/{pull.number}/head)
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubRepoActionsForPullRequestMergeRefUrl(
                    owner,
                    repo,
                    pull.number,
                  )}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Actions (refs/pull/{pull.number}/merge)
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubRepoActionsPullRequestRunsUrl(owner, repo)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Actions (event:pull_request)
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubRepoActionsUrl(owner, repo)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  All repo actions
                </a>
              </Button>
            </div>

            <h3 className="text-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
              Diff, conversation, and repo
            </h3>
            <div className="mb-6 flex flex-wrap gap-2">
              {pull.baseRef !== null && pull.headRef !== null ? (
                <Button asChild={true} size="sm" variant="outline">
                  <a
                    href={githubPullCompareUrl(
                      owner,
                      repo,
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
                  href={githubRepoWorkflowsDirUrl(owner, repo)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  .github/workflows
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

            <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm">
              <li>
                Open <span className="text-foreground font-medium">Checks</span>{' '}
                for required rules and the aggregated conclusion.
              </li>
              <li>
                Use <span className="text-foreground font-medium">Commits</span>{' '}
                or{' '}
                <span className="text-foreground font-medium">
                  Checks at head SHA
                </span>{' '}
                when one SHA failed and you need that job log.
              </li>
              <li>
                Prefer{' '}
                <span className="text-foreground font-medium">
                  refs/pull/{pull.number}/merge
                </span>{' '}
                Actions when debugging merge-result CI; use{' '}
                <span className="text-foreground font-medium">
                  refs/pull/{pull.number}/head
                </span>{' '}
                or{' '}
                <span className="text-foreground font-medium">branch name</span>{' '}
                for contributor-branch workflows.
              </li>
              <li>
                Confirm YAML under{' '}
                <span className="text-foreground font-medium">
                  .github/workflows
                </span>{' '}
                if triggers or paths look wrong.
              </li>
            </ol>
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

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
