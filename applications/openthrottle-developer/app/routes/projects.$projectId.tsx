import * as React from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Empty,
  EmptyDescription,
  EmptyTitle,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  OpenThrottleClipboard,
  OpenThrottlePagination,
} from '@openthrottle/react-router-ui';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { formatProjectDate } from '~/routing/projects/utils/format';
import { GetProjectByIdDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { ProjectNotFound } from '~/routing/projects/components/ProjectNotFound';
import { ProjectTasksTable } from '~/routing/projects/components/ProjectTasksTable';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/projects.$projectId';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.project?.name ?? 'Details',
  links: (_match) => [{ children: 'Projects', to: '/projects' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const projectId = args.params.projectId;
  const url = args.url;
  const pageRaw = url?.searchParams.get('page');
  const page = Math.max(
    1,
    Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : DEFAULT_PAGE,
  );
  const limitRaw = url?.searchParams.get('limit');
  const limitParsed =
    limitRaw != null && limitRaw !== '' ? Number(limitRaw) : NaN;
  const limit = Math.max(
    1,
    Number.isFinite(limitParsed) && limitParsed >= 1
      ? limitParsed
      : DEFAULT_LIMIT,
  );
  const offset = (page - 1) * limit;

  const { project, projectTasksResult } = await executeGraphqlWithAuth(
    args.request,
    GetProjectByIdDocument,
    { id: projectId, limit, offset },
  );

  const projectTasks = projectTasksResult.tasks;
  const totalTaskCount = projectTasksResult.totalCount;

  return {
    limit,
    page,
    project,
    projectTasks,
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
    : `Project Details | ${SITE_TITLE}`;

  return [{ title }];
});

type ProjectTabValue = 'overview' | 'tasks';

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { limit, page, project, projectTasks, totalTaskCount } = loaderData;

  // Hooks
  const [activeTab, setActiveTab] = React.useState<ProjectTabValue>('overview');

  // Setup
  const tasks = projectTasks ?? [];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!project) {
    return <ProjectNotFound />;
  }

  return (
    <GlobalScreen>
      <Tabs
        className="w-full"
        onValueChange={(next) => {
          setActiveTab(next as ProjectTabValue);
        }}
        value={activeTab}
      >
        <TabsList aria-label="Project sections" className="mb-4">
          <TabsTrigger id="project-tab-overview" value="overview">
            Overview
          </TabsTrigger>
          <TabsTrigger id="project-tab-tasks" value="tasks">
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-0" value="overview">
          <Card aria-labelledby="project-overview-heading">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="text-lg leading-none tracking-tight"
                  id="project-overview-heading"
                >
                  {project.name}
                </h1>
                {/* {project.nxProjectName != null &&
                  project.nxProjectName !== '' && (
                    <Badge variant="secondary">{project.nxProjectName}</Badge>
                  )} */}
              </div>
              <Badge className="shrink-0" variant="secondary">
                <OpenThrottleClipboard label={project.id} text={project.id} />
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description != null && project.description !== '' && (
                <>
                  <p className="text-muted-foreground text-sm">
                    {project.description}
                  </p>
                  <Separator />
                </>
              )}

              <dl className="grid gap-2 text-sm">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{formatProjectDate(project.createdAt)}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd>{formatProjectDate(project.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-0" value="tasks">
          <section
            aria-labelledby="project-tasks-heading"
            className="space-y-3"
          >
            <h2 className="text-lg" id="project-tasks-heading">
              Tasks
            </h2>
            {tasks.length > 0 ? (
              <>
                <ProjectTasksTable tasks={tasks} />
                <OpenThrottlePagination
                  basePath={`/projects/${project.id}`}
                  className="mt-6"
                  limit={limit}
                  page={page}
                  total={totalTaskCount}
                />
              </>
            ) : (
              <Empty className="py-8">
                <EmptyTitle>No tasks</EmptyTitle>
                <EmptyDescription>
                  This project has no tasks yet.
                </EmptyDescription>
              </Empty>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
