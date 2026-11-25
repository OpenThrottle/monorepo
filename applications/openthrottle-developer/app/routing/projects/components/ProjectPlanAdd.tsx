import { Button, cn, MultiSelect } from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import * as React from 'react';
import { useFetcher } from 'react-router';

import type { ProjectPlanCandidateFragment } from '~/__generated__/graphql';
import { planStatusValues } from '~/routing/plans/types';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';
import { PROJECT_PLANS_COPY } from '~/routing/projects/data/copy';
import { buildNewPlanPrompt } from '~/routing/projects/utils/projectPlans';

export interface ProjectPlanAddProps {
  readonly className?: string;
  readonly plans: readonly ProjectPlanCandidateFragment[];
  readonly project: { readonly id: string; readonly name: string };
}

/**
 * @description The project Plans section's actions: a searchable multi-select
 * that adds existing plans (appended in the order picked; a plan in another
 * project moves here, which its hint says), and a button that copies the MCP
 * prompt for a new plan already filed under this project.
 */
export const ProjectPlanAdd = (
  props: ProjectPlanAddProps,
): React.ReactElement => {
  const { className, plans, project } = props;

  // Hooks
  const fetcher = useFetcher<{ readonly projectError?: string }>();
  const [selectedIds, setSelectedIds] = React.useState<readonly string[]>([]);

  // Setup
  const isPending = fetcher.state !== 'idle';
  const error = fetcher.data?.projectError;
  const options = plans.map((plan) => {
    const status = isPlanStatusKey(plan.status)
      ? planStatusValues[plan.status]
      : plan.status;
    const otherProject = plan.projectRelation?.name;
    const where = otherProject
      ? ` · ${PROJECT_PLANS_COPY.inOtherProjectPrefix} ${otherProject}`
      : '';

    return { hint: `${status}${where}`, label: plan.title, value: plan.id };
  });
  const isMany = selectedIds.length > 1;
  const addLabel = isMany
    ? `${PROJECT_PLANS_COPY.addButtonCountPrefix} ${selectedIds.length} ${PROJECT_PLANS_COPY.addButtonCountSuffix}`
    : PROJECT_PLANS_COPY.addButton;

  // Handlers
  const handleAdd = (): void => {
    if (selectedIds.length === 0) return;
    const formData = new FormData();
    formData.set('intent', 'addPlanToProject');
    selectedIds.forEach((id) => formData.append('planId', id));
    fetcher.submit(formData, { method: 'post' });
    setSelectedIds([]);
  };

  // Markup
  const errorMarkup = (
    <p className="text-destructive w-full text-right text-xs" role="alert">
      {error}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-wrap items-center justify-end gap-1', className)}
      data-testid="ProjectPlanAdd"
    >
      <OpenThrottleClipboard
        className="hover:bg-accent text-muted-foreground mr-2 h-7 rounded-md px-2 text-xs"
        label={PROJECT_PLANS_COPY.newPlanCopy}
        text={buildNewPlanPrompt(project)}
      />
      <MultiSelect
        className="min-h-7 w-72 py-1 text-xs"
        emptyText={PROJECT_PLANS_COPY.addEmpty}
        onChange={setSelectedIds}
        options={options}
        placeholder={PROJECT_PLANS_COPY.addPlaceholder}
        searchPlaceholder={PROJECT_PLANS_COPY.addSearch}
        value={selectedIds}
      />
      <Button
        disabled={isPending || selectedIds.length === 0}
        onClick={handleAdd}
        size="xs"
        type="button"
        variant="outline"
      >
        {addLabel}
      </Button>
      {error ? errorMarkup : null}
    </div>
  );
};
