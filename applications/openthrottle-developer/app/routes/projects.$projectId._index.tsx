import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  mergeRouteModuleMeta,
  parsePaginationPage,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/projects.$projectId._index';
import {
  GetProjectByIdDocument,
  ProjectDetailWorkspaceRepositoriesDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { markDeferredHandled } from '~/global/utils/markDeferredHandled';
import { runProjectDetailAction } from '~/routing/projects/actions/projectId';
import { ProjectDetailView } from '~/routing/projects/components/ProjectDetailView';
import { ProjectNotFound } from '~/routing/projects/components/ProjectNotFound';
import { PROJECT_PLANS_PAGE_LIMIT } from '~/routing/projects/config/projects.defaults';
import {
  getAvailablePlans,
  getUnlinkedRepositories,
} from '~/routing/projects/utils/projectPlans';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.project?.name ?? 'Details',
  links: (_match) => [{ children: 'Projects', to: '/projects' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const projectId = args.params.projectId;
  // The page size is fixed: only `?page=` is read, so a hand-edited `?limit=`
  // cannot pull the whole project back into one response.
  const page = parsePaginationPage(args.url.searchParams.get('page'));
  const offset = (page - 1) * PROJECT_PLANS_PAGE_LIMIT;

  // Deferred: workspaceRepositories refreshes checkout snapshots (~1.3s cold),
  // so it streams into the repository picker instead of holding the page. Issued
  // before the critical await so nothing waterfalls; marked handled so a
  // rejection reaches its errorElement rather than the process.
  const workspaceRepositories = executeGraphqlWithAuth(
    args.request,
    ProjectDetailWorkspaceRepositoriesDocument,
    {},
  ).then((result) => {
    return result.workspaceRepositories;
  });
  markDeferredHandled([workspaceRepositories]);

  const { availablePlans, project, projectPlansPage, skillTagVocabulary } =
    await executeGraphqlWithAuth(args.request, GetProjectByIdDocument, {
      id: projectId,
      limit: PROJECT_PLANS_PAGE_LIMIT,
      offset,
    });
  const linkedRepositories = project?.repositories ?? [];

  return {
    availablePlans: getAvailablePlans(availablePlans, projectId),
    availableRepositories: workspaceRepositories.then((repositories) => {
      return getUnlinkedRepositories(repositories, linkedRepositories);
    }),
    page,
    pageOffset: offset,
    project,
    projectPlans: projectPlansPage.items,
    projectPlansTotal: projectPlansPage.totalCount,
    tagVocabulary: skillTagVocabulary.tags ?? [],
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const project = args.loaderData?.project;
  const title = project?.name
    ? `${project.name} | Projects | ${SITE_TITLE}`
    : `Project | Projects | ${SITE_TITLE}`;

  return [{ title }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const {
    availablePlans,
    availableRepositories,
    page,
    pageOffset,
    project,
    projectPlans,
    projectPlansTotal,
    tagVocabulary,
  } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!project) {
    return <ProjectNotFound />;
  }

  return (
    <GlobalScreen>
      <ProjectDetailView
        availablePlans={availablePlans}
        availableRepositories={availableRepositories}
        page={page}
        pageOffset={pageOffset}
        plans={projectPlans}
        plansTotal={projectPlansTotal}
        project={project}
        tagVocabulary={tagVocabulary}
      />
    </GlobalScreen>
  );
}

export const action = (args: Route.ActionArgs) => {
  return runProjectDetailAction(args);
};

export const ErrorBoundary = GlobalErrorBoundary;
