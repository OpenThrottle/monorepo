import type { ComboboxOption } from '@openthrottle/react-router-shadcn';
import { Badge, Button, cn, Combobox } from '@openthrottle/react-router-shadcn';
import {
  FolderGit2Icon,
  FolderInputIcon,
  FolderPlusIcon,
  StarIcon,
  XIcon,
} from 'lucide-react';
import * as React from 'react';
import { Link, useFetcher } from 'react-router';

import type {
  PlanProjectOptionFragment,
  ProjectDetailsFragment,
} from '~/__generated__/graphql';
import { PLAN_PROJECT_COPY } from '~/routing/plans/data/copy';
import { usePlanDeferredValue } from '~/routing/plans/hooks/usePlanDeferredValue';
import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';
import { groupProjectPickerOptions } from '~/routing/plans/utils/groupProjectPickerOptions';

export interface PlanProjectControlProps {
  readonly className?: string;
  /** The plan's current project, or null when it belongs to none. */
  readonly project: ProjectDetailsFragment | null | undefined;
}

/**
 * @description The plan header's project slot: a badge linking to the plan's
 * project, a picker that adds the plan to a project (or moves it to another,
 * landing at the end of that project's order), and a remove button. The picker
 * lists the user's starred projects first, then every other project, each by
 * name; the current project is marked and picking it does nothing. Posts
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
  const { others, starred } = groupProjectPickerOptions(options ?? []);
  const triggerLabel = project
    ? PLAN_PROJECT_COPY.change
    : PLAN_PROJECT_COPY.add;
  const TriggerIcon = project ? FolderInputIcon : FolderPlusIcon;

  // Handlers
  const handleAssign = (projectId: string): void => {
    if (projectId === project?.id) {
      return;
    }
    fetcher.submit(
      { intent: 'assignPlanProject', projectId },
      { method: 'post' },
    );
  };
  const handleRemove = (): void => {
    fetcher.submit({ intent: 'removePlanProject' }, { method: 'post' });
  };

  // Markup
  const starredIcon = (
    <StarIcon
      aria-hidden={true}
      className="size-4 shrink-0 fill-yellow-400 text-yellow-400"
    />
  );
  const projectIcon = (
    <FolderGit2Icon
      aria-hidden={true}
      className="text-muted-foreground size-4 shrink-0"
    />
  );
  const toOption = (
    option: PlanProjectOptionFragment,
    group: string,
  ): ComboboxOption => {
    const icon = option.isFavorite ? starredIcon : projectIcon;

    return {
      group,
      hint: option.id === project?.id ? PLAN_PROJECT_COPY.current : undefined,
      icon,
      label: option.name,
      value: option.id,
    };
  };
  const candidates = [
    ...starred.map((option) => {
      return toOption(option, PLAN_PROJECT_COPY.starredGroup);
    }),
    ...others.map((option) => {
      return toOption(option, PLAN_PROJECT_COPY.allGroup);
    }),
  ];
  const triggerMarkup = (
    <span className="inline-flex items-center gap-1.5">
      <TriggerIcon aria-hidden={true} className="size-3.5" />
      {triggerLabel}
    </span>
  );
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
        className="text-muted-foreground hover:text-foreground size-6"
        disabled={isPending}
        onClick={handleRemove}
        size="icon"
        title={PLAN_PROJECT_COPY.remove}
        type="button"
        variant="ghost"
      >
        <XIcon aria-hidden={true} className="size-3.5" />
      </Button>
    </span>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      data-testid="PlanProjectControl"
    >
      {badgeMarkup}
      <label className="sr-only" htmlFor={pickerId}>
        {triggerLabel}
      </label>
      <Combobox
        className="text-muted-foreground hover:text-foreground h-7 w-auto gap-1.5 border-dashed px-2.5 text-xs"
        contentClassName="w-96"
        disabled={isPending}
        emptyText={PLAN_PROJECT_COPY.empty}
        id={pickerId}
        loading={isLoading}
        loadingText={PLAN_PROJECT_COPY.loading}
        onValueChange={handleAssign}
        options={candidates}
        placeholder={triggerMarkup}
        searchPlaceholder={PLAN_PROJECT_COPY.search}
      />
    </span>
  );
};
