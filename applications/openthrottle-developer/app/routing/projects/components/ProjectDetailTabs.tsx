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
import { useFetcher } from 'react-router';
import {
  OpenThrottleClipboard,
  OpenThrottlePagination,
} from '@openthrottle/react-router-ui';
import { formatProjectDate } from '~/routing/projects/utils/format';
import { isProjectTabValue } from '~/routing/projects/utils/is-project-tab-value';
import { type ProjectTabValue } from '~/routing/projects/data/tabs';
import { PlanTagChips } from '~/routing/plans/components/PlanTagChips';
import { ProjectTasksTable } from '~/routing/projects/components/ProjectTasksTable';
import type { Route } from '@/app/routes/+types/projects.$projectId';

type ProjectDetailLoaderData = Route.ComponentProps['loaderData'];

export interface ProjectDetailTabsProps {
  limit: number;
  page: number;
  project: NonNullable<ProjectDetailLoaderData['project']>;
  tagVocabulary: ProjectDetailLoaderData['tagVocabulary'];
  tasks: ProjectDetailLoaderData['projectTasks'];
  totalTaskCount: number;
}

/**
 * @description Project detail Overview/Tasks tabs (metadata card + tag chips +
 * tasks table). Owns the active-tab state and the tag add/remove fetcher.
 * Extracted from the route Component per route-primitive-shape R4.
 */
export const ProjectDetailTabs = (
  props: ProjectDetailTabsProps,
): React.ReactElement => {
  const { limit, page, project, tagVocabulary, tasks, totalTaskCount } = props;

  // Hooks
  const [activeTab, setActiveTab] = React.useState<ProjectTabValue>('overview');
  const tagFetcher = useFetcher();

  // Setup
  const rows = tasks ?? [];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tabs
      className="w-full"
      onValueChange={(next) => {
        if (isProjectTabValue(next)) {
          setActiveTab(next);
        }
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

            <Separator />

            <div className="space-y-2">
              <h2 className="text-muted-foreground text-xs font-medium uppercase">
                Tags
              </h2>
              <PlanTagChips
                onAddTag={(tag) =>
                  tagFetcher.submit(
                    { intent: 'addProjectTag', tag },
                    { method: 'post' },
                  )
                }
                onRemoveTag={(tag) =>
                  tagFetcher.submit(
                    { intent: 'removeProjectTag', tag },
                    { method: 'post' },
                  )
                }
                pending={tagFetcher.state !== 'idle'}
                tags={project.tags}
                vocabulary={tagVocabulary}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent className="mt-0" value="tasks">
        <section aria-labelledby="project-tasks-heading" className="space-y-3">
          <h2 className="text-lg" id="project-tasks-heading">
            Tasks
          </h2>
          {rows.length > 0 ? (
            <>
              <ProjectTasksTable tasks={rows} />
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
  );
};
