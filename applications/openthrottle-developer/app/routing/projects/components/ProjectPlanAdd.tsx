import { Button, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useFetcher } from 'react-router';

import { PROJECT_PLANS_COPY } from '~/routing/projects/data/data.copy';

export interface ProjectPlanAddOption {
  readonly id: string;
  readonly title: string;
}

export interface ProjectPlanAddProps {
  readonly className?: string;
  readonly plans: readonly ProjectPlanAddOption[];
}

/**
 * @description Picker that adds an existing plan to the project (appended at
 * the end of the order). Posts the `addPlanToProject` intent.
 */
export const ProjectPlanAdd = (
  props: ProjectPlanAddProps,
): React.ReactElement => {
  const { className, plans } = props;

  // Hooks
  const fetcher = useFetcher();
  const [selectedId, setSelectedId] = React.useState('');

  // Setup
  const isPending = fetcher.state !== 'idle';

  // Handlers
  const handleAdd = (): void => {
    if (selectedId === '') return;
    fetcher.submit(
      { intent: 'addPlanToProject', planId: selectedId },
      { method: 'post' },
    );
    setSelectedId('');
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      data-testid="ProjectPlanAdd"
    >
      <select
        aria-label={PROJECT_PLANS_COPY.addLabel}
        className="border-input bg-background h-7 max-w-64 rounded-md border px-2 text-xs"
        onChange={(event) => setSelectedId(event.target.value)}
        value={selectedId}
      >
        <option value="">{PROJECT_PLANS_COPY.addPlaceholder}</option>
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.title}
          </option>
        ))}
      </select>
      <Button
        disabled={isPending || selectedId === ''}
        onClick={handleAdd}
        size="xs"
        type="button"
        variant="outline"
      >
        {PROJECT_PLANS_COPY.addButton}
      </Button>
    </div>
  );
};
