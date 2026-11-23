import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { PLAN_WORKFLOW_CONFIG_TARGET_COPY } from '~/routing/plans/data/data.copy';
import type {
  PlanRunOptions,
  PlanRunTargetMode,
} from '~/routing/plans/utils/plan-run-options';
import { isUuid } from '~/routing/plans/utils/plan-run-options';

export interface PlanWorkflowConfigTargetProps {
  heading: string;
  input: PlanRunOptions;
  setInput: (updater: React.SetStateAction<PlanRunOptions>) => void;
}

export const PlanWorkflowConfigTarget = (
  props: PlanWorkflowConfigTargetProps,
): React.ReactElement => {
  const { heading, input, setInput } = props;

  // Hooks

  // Setup
  const targetModeLabel = input.targetMode === 'plan' ? 'Plan' : 'Task';
  const isPlanMode = input.targetMode === 'plan';
  const isTaskMode = input.targetMode === 'task';

  const activePlanId = isPlanMode ? input.planId.trim() : '';
  const activeTaskId = isTaskMode ? input.taskId.trim() : '';

  const targetIdWarning = isPlanMode
    ? activePlanId !== '' && !isUuid(activePlanId)
    : activeTaskId !== '' && !isUuid(activeTaskId);

  // Handlers
  const handleTargetModeChange = (value: PlanRunTargetMode): void => {
    setInput((prev) => ({ ...prev, targetMode: value }));
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      className="border-0"
      id="workflow-config-target-legend"
      legend={heading}
    >
      <p className="text-muted-foreground text-xs">
        The target saved with the plan's run configuration: this plan, or a
        single task. Runs queued from this page always target the plan.
      </p>
      <div className="space-y-2">
        <Label htmlFor="workflow-config-target-mode">Target mode</Label>
        <Select
          onValueChange={(v) => {
            if (v === 'plan' || v === 'task') {
              handleTargetModeChange(v);
            }
          }}
          value={input.targetMode}
        >
          <SelectTrigger
            aria-label="Run target: plan or task"
            className="max-w-md"
            id="workflow-config-target-mode"
          >
            <SelectValue placeholder="Target mode">
              {targetModeLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plan">Plan</SelectItem>
            <SelectItem value="task">Task</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPlanMode && (
        <div className="space-y-2">
          <Label htmlFor="workflow-run-plan-id">Plan ID</Label>
          <Input
            aria-describedby="workflow-run-plan-id-hint"
            aria-label="Plan UUID"
            autoComplete="off"
            data-testid="workflow-run-plan-id-input"
            id="workflow-run-plan-id"
            onChange={(e) =>
              setInput((prev) => ({ ...prev, planId: e.target.value }))
            }
            placeholder="Plan UUID"
            spellCheck={false}
            value={input.planId}
          />
          <p
            className="text-muted-foreground text-xs"
            id="workflow-run-plan-id-hint"
          >
            Example: 77cb14a0-5eb0-4061-87ea-d618b85e8818
          </p>
        </div>
      )}
      {!isPlanMode && (
        <div className="space-y-2">
          <Label htmlFor="workflow-run-task-id">Task ID</Label>
          <Input
            aria-describedby="workflow-run-task-id-hint"
            aria-label="Task UUID"
            autoComplete="off"
            data-testid="workflow-run-task-id-input"
            id="workflow-run-task-id"
            onChange={(e) =>
              setInput((prev) => ({ ...prev, taskId: e.target.value }))
            }
            placeholder="Task UUID"
            spellCheck={false}
            value={input.taskId}
          />
          <p
            className="text-muted-foreground text-xs"
            id="workflow-run-task-id-hint"
          >
            Example: 45a30762-92a9-42f4-90e0-2437c7ef26a8
          </p>
        </div>
      )}

      {targetIdWarning && (
        <p className="text-destructive text-xs" role="alert">
          {PLAN_WORKFLOW_CONFIG_TARGET_COPY.invalidIdWarning}
        </p>
      )}
    </OpenThrottleFieldset>
  );
};
