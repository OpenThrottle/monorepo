import { Badge, Button, cn, Combobox } from '@openthrottle/react-router-shadcn';
import { FolderGit2Icon, XIcon } from 'lucide-react';
import * as React from 'react';
import { Link, useFetcher } from 'react-router';

import type { ProjectDetailsFragment } from '~/__generated__/graphql';
import { PLAN_PROJECT_COPY } from '~/routing/plans/data/copy';
import { usePlanDeferredValue } from '~/routing/plans/hooks/usePlanDeferredValue';
import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';

export interface PlanProjectControlProps {
  readonly className?: string;
  /** The plan's current project, or null when it belongs to none. */
  readonly project: ProjectDetailsFragment | null | undefined;
}

/**
 * @description The plan header's project slot: a badge linking to the plan's
 * project, a picker that adds the plan to a project (or moves it to another,
 * landing at the end of that project's order), and a remove button. Posts
 * `assignPlanProject` / `removePlanProject` to the plan route action. Picker
 * candidates come from the route's deferred `projects` loader key.
 */
export const PlanProjectControl = (
  props: PlanProjectControlProps,
): React.ReactElement => {
  const { className, project } = props;

  // Hooks
  const fetcher = useFetcher();
  const { projects } = usePlanDetailRouteData();
  const pickerId = React.useId();
  const options = usePlanDeferredValue(projects);

  // Setup
  const isPending = fetcher.state !== 'idle';
  const isLoading = options === undefined;
  const candidates = (options ?? [])
    .filter((option) => option.id !== project?.id)
    .map((option) => ({ label: option.name, value: option.id }));
  const triggerLabel = project
    ? PLAN_PROJECT_COPY.change
    : PLAN_PROJECT_COPY.add;
  const emptyText = project
    ? PLAN_PROJECT_COPY.noOtherProjects
    : PLAN_PROJECT_COPY.empty;

  // Handlers
  const handleAssign = (projectId: string): void => {
    fetcher.submit(
      { intent: 'assignPlanProject', projectId },
      { method: 'post' },
    );
  };
  const handleRemove = (): void => {
    fetcher.submit({ intent: 'removePlanProject' }, { method: 'post' });
  };

  // Markup
  const badgeMarkup = project && (
    <span className="inline-flex items-center gap-0.5">
      <Badge
        asChild={true}
        color="sky"
        data-testid="PlanProjectBadge"
        size="xs"
      >
        <Link
          aria-label={`${PLAN_PROJECT_COPY.badgeAriaPrefix} ${project.name}`}
          prefetch="intent"
          to={`/projects/${project.id}`}
        >
          <FolderGit2Icon aria-hidden={true} />
          {project.name}
        </Link>
      </Badge>
      <Button
        aria-label={PLAN_PROJECT_COPY.remove}
        className="text-muted-foreground size-5"
        disabled={isPending}
        onClick={handleRemove}
        size="icon"
        title={PLAN_PROJECT_COPY.remove}
        type="button"
        variant="ghost"
      >
        <XIcon aria-hidden={true} className="size-3" />
      </Button>
    </span>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      data-testid="PlanProjectControl"
    >
      {badgeMarkup}
      <label className="sr-only" htmlFor={pickerId}>
        {triggerLabel}
      </label>
      <Combobox
        className="text-muted-foreground h-6 w-auto gap-1 border-dashed px-2 text-xs"
        contentClassName="w-auto min-w-64 max-w-96"
        disabled={isPending}
        emptyText={emptyText}
        id={pickerId}
        loading={isLoading}
        loadingText={PLAN_PROJECT_COPY.loading}
        onValueChange={handleAssign}
        options={candidates}
        placeholder={triggerLabel}
        searchPlaceholder={PLAN_PROJECT_COPY.search}
      />
    </span>
  );
};
