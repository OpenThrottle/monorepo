import * as React from 'react';
import classnames from 'classnames';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import {
  isCortexUuid,
  type WorkflowRalphRunOptionsInput,
  type WorkflowRalphTargetMode,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanWorkflowConfigTargetProps {
  readonly className?: string;
  readonly input: WorkflowRalphRunOptionsInput;
  readonly setInput: (
    updater: React.SetStateAction<WorkflowRalphRunOptionsInput>,
  ) => void;
}

export const PlanWorkflowConfigTarget = (
  props: PlanWorkflowConfigTargetProps,
) => {
  const { className, input, setInput } = props;

  // Hooks

  // Setup
  const isPlanMode = input.targetMode === 'plan';
  const isTaskMode = input.targetMode === 'task';

  const activePlanId = isPlanMode ? input.planId.trim() : '';
  const activeTaskId = isTaskMode ? input.taskId.trim() : '';

  const targetIdWarning = isPlanMode
    ? activePlanId !== '' && !isCortexUuid(activePlanId)
    : activeTaskId !== '' && !isCortexUuid(activeTaskId);

  // Handlers
  const handleTargetModeChange = (value: WorkflowRalphTargetMode): void => {
    setInput((prev) => ({ ...prev, targetMode: value }));
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <fieldset
      aria-labelledby="workflow-run-target-legend"
      className={classnames(
        'space-y-3 rounded-md border border-border p-4',
        className,
      )}
      data-testid="PlanWorkflowConfigTarget"
    >
      <legend
        className="px-1 text-sm font-medium text-foreground"
        id="workflow-run-target-legend"
      >
        Run target
      </legend>
      <p className="text-muted-foreground text-xs">
        For the CLI preview: one of <code className="text-xs">--plan</code> or{' '}
        <code className="text-xs">--task</code>. Queued runs always target this
        plan; switching to task mode here only changes the preview and copyable
        command, not the BullMQ job.
      </p>
      <div className="space-y-2">
        <Label htmlFor="workflow-run-target-mode">Target mode</Label>
        <Select
          onValueChange={(v) => {
            if (v === 'plan' || v === 'task') {
              handleTargetModeChange(v);
            }
          }}
          value={input.targetMode}
        >
          <SelectTrigger
            aria-label="Cortex run target: plan or task"
            className="max-w-md"
            id="workflow-run-target-mode"
          >
            <SelectValue placeholder="Target mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plan">Cortex plan (--plan)</SelectItem>
            <SelectItem value="task">Cortex task (--task)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {input.targetMode === 'plan' ? (
        <div className="space-y-2">
          <Label htmlFor="workflow-run-plan-id">--plan</Label>
          <Input
            aria-describedby="workflow-run-plan-id-hint"
            aria-label="Cortex plan UUID for --plan"
            autoComplete="off"
            data-testid="workflow-run-plan-id-input"
            id="workflow-run-plan-id"
            onChange={(e) =>
              setInput((prev) => ({ ...prev, planId: e.target.value }))
            }
            placeholder="Cortex plan UUID"
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
      ) : (
        <div className="space-y-2">
          <Label htmlFor="workflow-run-task-id">--task</Label>
          <Input
            aria-describedby="workflow-run-task-id-hint"
            aria-label="Cortex task UUID for --task"
            autoComplete="off"
            data-testid="workflow-run-task-id-input"
            id="workflow-run-task-id"
            onChange={(e) =>
              setInput((prev) => ({ ...prev, taskId: e.target.value }))
            }
            placeholder="Cortex task UUID"
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

      {targetIdWarning ? (
        <p className="text-destructive text-xs" role="alert">
          Value does not match a Cortex UUID (v4) pattern; CLI validation may
          fail.
        </p>
      ) : null}
    </fieldset>
  );
};
