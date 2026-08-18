import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  mergeRouteModuleMeta,
  parsePagination,
} from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GetProjectByIdDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { ProjectDetailTabs } from '~/routing/projects/components/ProjectDetailTabs';
import { ProjectNotFound } from '~/routing/projects/components/ProjectNotFound';
import { runProjectDetailAction } from '~/routing/projects/actions/projectId';
import {
  PROJECT_TASKS_DEFAULT_LIMIT,
  PROJECT_TASKS_DEFAULT_PAGE,
} from '~/routing/projects/config/projects.defaults';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/projects.$projectId._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.project?.name ?? 'Details',
  links: (_match) => [{ children: 'Projects', to: '/projects' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const projectId = args.params.projectId;
  const url = args.url;
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const { limit, offset, page } = parsePagination(searchParams, {
    defaultLimit: PROJECT_TASKS_DEFAULT_LIMIT,
    defaultPage: PROJECT_TASKS_DEFAULT_PAGE,
  });

  const { project, projectTasksResult, skillTagVocabulary } =
    await executeGraphqlWithAuth(args.request, GetProjectByIdDocument, {
      id: projectId,
      limit,
      offset,
    });

  const projectTasks = projectTasksResult.tasks;
  const totalTaskCount = projectTasksResult.totalCount;

  return {
    limit,
    page,
    project,
    projectTasks,
    tagVocabulary: skillTagVocabulary.tags ?? [],
    totalTaskCount,
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
  const { limit, page, project, projectTasks, tagVocabulary, totalTaskCount } =
    loaderData;

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
      <ProjectDetailTabs
        limit={limit}
        page={page}
        project={project}
        tagVocabulary={tagVocabulary}
        tasks={projectTasks}
        totalTaskCount={totalTaskCount}
      />
    </GlobalScreen>
  );
}

export const action = (args: Route.ActionArgs) => runProjectDetailAction(args);

export const ErrorBoundary = GlobalErrorBoundary;
