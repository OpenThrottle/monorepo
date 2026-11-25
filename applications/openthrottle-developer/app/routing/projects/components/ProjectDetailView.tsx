import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Separator,
} from '@openthrottle/react-router-shadcn';
import {
  OpenThrottleClipboard,
  OpenThrottlePagination,
} from '@openthrottle/react-router-ui';
import * as React from 'react';
import { Link, useFetcher } from 'react-router';

import type { Route } from '@/app/routes/+types/projects.$projectId._index';
import type { ProjectPageDetailsFragment } from '~/__generated__/graphql';
import { PlanTagChips } from '~/routing/plans/components/PlanTagChips';
import { ProjectFavorite } from '~/routing/projects/components/ProjectFavorite';
import { ProjectPlanAdd } from '~/routing/projects/components/ProjectPlanAdd';
import { ProjectPlansList } from '~/routing/projects/components/ProjectPlansList';
import { ProjectRepositories } from '~/routing/projects/components/ProjectRepositories';
import { PROJECT_PLANS_PAGE_LIMIT } from '~/routing/projects/config/projects.defaults';
import { PROJECT_PLANS_COPY } from '~/routing/projects/data/copy';
import { formatProjectDate } from '~/routing/projects/utils/format';

type ProjectDetailLoaderData = Route.ComponentProps['loaderData'];

export interface ProjectDetailViewProps {
  availablePlans: ProjectDetailLoaderData['availablePlans'];
  availableRepositories: ProjectDetailLoaderData['availableRepositories'];
  page: number;
  pageOffset: number;
  plans: ProjectDetailLoaderData['projectPlans'];
  plansTotal: number;
  project: ProjectPageDetailsFragment;
  tagVocabulary: ProjectDetailLoaderData['tagVocabulary'];
}

/**
 * @description Project detail page body: overview card with tag chips, linked
 * repositories and one page of the ordered plan list with its pager. Owns the tag add/remove fetcher.
 * Extracted from the route Component per route-primitive-shape R4.
 */
export const ProjectDetailView = (
  props: ProjectDetailViewProps,
): React.ReactElement => {
  const {
    availablePlans,
    availableRepositories,
    page,
    pageOffset,
    plans,
    plansTotal,
    project,
    tagVocabulary,
  } = props;

  // Hooks
  const tagFetcher = useFetcher();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="w-full space-y-8">
      <Card aria-labelledby="project-overview-heading">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <ProjectFavorite
              favorite={project.isFavorite}
              projectId={project.id}
              projectName={project.name}
            />
            <h1
              className="text-lg leading-none tracking-tight"
              id="project-overview-heading"
            >
              {project.name}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary">
              <OpenThrottleClipboard label={project.id} text={project.id} />
            </Badge>
            <Button asChild={true} size="sm" variant="outline">
              <Link to={`/projects/${project.id}/edit`}>Edit</Link>
            </Button>
          </div>
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

      <ProjectRepositories
        available={availableRepositories}
        linked={project.repositories}
      />

      <section aria-labelledby="project-plans-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg" id="project-plans-heading">
            {PROJECT_PLANS_COPY.heading}
          </h2>
          <ProjectPlanAdd plans={availablePlans} project={project} />
        </div>
        <ProjectPlansList
          offset={pageOffset}
          plans={plans}
          totalCount={plansTotal}
        />
        <OpenThrottlePagination
          basePath={`/projects/${project.id}`}
          className="mt-4"
          limit={PROJECT_PLANS_PAGE_LIMIT}
          page={page}
          resultLabel="plans"
          total={plansTotal}
        />
      </section>
    </div>
  );
};
