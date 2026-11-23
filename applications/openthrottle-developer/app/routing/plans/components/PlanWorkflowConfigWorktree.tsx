import { buildPlanRunWorktreeName } from '@openthrottle/openthrottle-plan-config';
import { Input, Label } from '@openthrottle/react-router-shadcn';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { PlanWorkflowConfigWorktreeCleanup } from '~/routing/plans/components/PlanWorkflowConfigWorktreeCleanup';
import { PLAN_CONFIG_WORKTREE_COPY } from '~/routing/plans/data/data.copy';
import type { PlanRunOptions } from '~/routing/plans/utils/plan-run-options';

export interface PlanWorkflowConfigWorktreeProps {
  heading: string;
  input: PlanRunOptions;
  setInput: (updater: React.SetStateAction<PlanRunOptions>) => void;
}

export const PlanWorkflowConfigWorktree = (
  props: PlanWorkflowConfigWorktreeProps,
): React.ReactElement => {
  const { heading, input, setInput } = props;

  // Hooks

  // Setup
  const derivedWorktreeName =
    input.planId.trim() === '' ? '' : buildPlanRunWorktreeName(input.planId);
  const hasDerivedName = derivedWorktreeName !== '';
  const exampleName = 'e.g. plan-5e172b67';
  const namePlaceholder = hasDerivedName ? derivedWorktreeName : exampleName;
  const fallbackLabel = 'a name derived from the plan id';
  const autoNameLabel = hasDerivedName ? derivedWorktreeName : fallbackLabel;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      className="border-0"
      id="workflow-run-worktree-legend"
      legend={heading}
    >
      <p className="text-muted-foreground text-xs">
        {PLAN_CONFIG_WORKTREE_COPY.explainer}
      </p>
      <div className="space-y-2">
        <Label htmlFor="workflow-run-worktree-name">
          {PLAN_CONFIG_WORKTREE_COPY.nameLabel}
        </Label>
        <Input
          aria-describedby="workflow-run-worktree-name-hint"
          aria-label={PLAN_CONFIG_WORKTREE_COPY.nameAriaLabel}
          autoComplete="off"
          id="workflow-run-worktree-name"
          onChange={(e) =>
            setInput((prev) => ({
              ...prev,
              worktreeName: e.target.value,
            }))
          }
          placeholder={namePlaceholder}
          spellCheck={false}
          value={input.worktreeName}
        />
        <p
          className="text-muted-foreground text-xs"
          id="workflow-run-worktree-name-hint"
        >
          {PLAN_CONFIG_WORKTREE_COPY.autoNameHint(autoNameLabel)}
        </p>
      </div>
      <PlanWorkflowConfigWorktreeCleanup input={input} setInput={setInput} />
    </OpenThrottleFieldset>
  );
};
