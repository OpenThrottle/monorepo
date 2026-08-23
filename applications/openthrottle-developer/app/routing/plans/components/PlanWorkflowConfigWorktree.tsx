import * as React from 'react';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { buildPlanRunWorktreeName } from '@openthrottle/openthrottle-plan-config';
import {
  WORKFLOW_RALPH_ENV_VARS,
  type WorkflowRalphRunOptionsInput,
  type WorkflowRalphWorktreeCli,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { PLAN_CONFIG_WORKTREE_COPY } from '~/routing/plans/data/data.copy';
import { PlanWorkflowConfigWorktreeCursorFields } from '~/routing/plans/components/PlanWorkflowConfigWorktreeCursorFields';

export interface PlanWorkflowConfigWorktreeProps {
  heading: string;
  input: WorkflowRalphRunOptionsInput;
  setInput: (
    updater: React.SetStateAction<WorkflowRalphRunOptionsInput>,
  ) => void;
}

export const PlanWorkflowConfigWorktree = (
  props: PlanWorkflowConfigWorktreeProps,
): React.ReactElement => {
  const { heading, input, setInput } = props;

  // Hooks

  // Setup
  const derivedWorktreeName =
    input.planId.trim() === '' ? '' : buildPlanRunWorktreeName(input.planId);

  // Handlers
  const handleWorktreeCliChange = (value: WorkflowRalphWorktreeCli): void => {
    setInput((prev) => {
      if (value === 'named') {
        return { ...prev, worktreeCli: value };
      }

      if (value === 'flag-only') {
        return {
          ...prev,
          worktreeCli: value,
          worktreeName: '',
        };
      }

      return {
        ...prev,
        worktreeCli: value,
        worktreeName: '',
      };
    });
  };

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
        <Label htmlFor="workflow-run-worktree-cli">
          {PLAN_CONFIG_WORKTREE_COPY.modeLabel}
        </Label>
        <Select
          onValueChange={(v) => {
            if (v === 'omit' || v === 'flag-only' || v === 'named') {
              handleWorktreeCliChange(v);
            }
          }}
          value={input.worktreeCli}
        >
          <SelectTrigger
            aria-describedby="workflow-run-worktree-cli-hint"
            className="max-w-md"
            id="workflow-run-worktree-cli"
          >
            <SelectValue placeholder="Agent worktree mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="omit">
              {PLAN_CONFIG_WORKTREE_COPY.modeOmitLabel}
            </SelectItem>
            <SelectItem value="named">On (named worktree)</SelectItem>
            <SelectItem value="flag-only">
              Flag only (--worktree, CLI preview only)
            </SelectItem>
          </SelectContent>
        </Select>
        <p
          className="text-muted-foreground text-xs"
          id="workflow-run-worktree-cli-hint"
        >
          {input.worktreeCli === 'omit'
            ? PLAN_CONFIG_WORKTREE_COPY.offWarning
            : null}{' '}
          Env:{' '}
          <code className="text-xs">{WORKFLOW_RALPH_ENV_VARS.worktree}</code>.
          Flag-only is a local CLI preview mode; it is not sent on enqueue.
        </p>
      </div>
      {input.worktreeCli === 'named' ? (
        <div className="space-y-2">
          <Label htmlFor="workflow-run-worktree-name">
            {PLAN_CONFIG_WORKTREE_COPY.nameLabel}
          </Label>
          <Input
            aria-describedby="workflow-run-worktree-name-hint"
            aria-label="Agent CLI worktree name for --worktree"
            autoComplete="off"
            id="workflow-run-worktree-name"
            onChange={(e) =>
              setInput((prev) => ({
                ...prev,
                worktreeName: e.target.value,
              }))
            }
            placeholder={
              derivedWorktreeName === ''
                ? 'e.g. plan-5e172b67'
                : derivedWorktreeName
            }
            spellCheck={false}
            value={input.worktreeName}
          />
          <p
            className="text-muted-foreground text-xs"
            id="workflow-run-worktree-name-hint"
          >
            {derivedWorktreeName === ''
              ? PLAN_CONFIG_WORKTREE_COPY.autoNameHint(
                  'a name derived from the plan id',
                )
              : PLAN_CONFIG_WORKTREE_COPY.autoNameHint(derivedWorktreeName)}
          </p>
        </div>
      ) : null}
      <PlanWorkflowConfigWorktreeCursorFields
        input={input}
        setInput={setInput}
      />
    </OpenThrottleFieldset>
  );
};
