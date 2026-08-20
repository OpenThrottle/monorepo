import * as React from 'react';
import { Input, Label, Switch } from '@openthrottle/react-router-shadcn';
import {
  WORKFLOW_RALPH_ENV_VARS,
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanWorkflowConfigWorktreeCursorFieldsProps {
  input: WorkflowRalphRunOptionsInput;
  setInput: (
    updater: React.SetStateAction<WorkflowRalphRunOptionsInput>,
  ) => void;
}

/**
 * @description Cursor-only worktree fields (`--worktree-base`, `--skip-worktree-setup`) for the
 * Configuration tab's worktree fieldset. These are agent-CLI flags for a LOCAL cursor-agent run;
 * queued runs get their worktree from OpenThrottle instead.
 */
export const PlanWorkflowConfigWorktreeCursorFields = (
  props: PlanWorkflowConfigWorktreeCursorFieldsProps,
): React.ReactElement => {
  const { input, setInput } = props;

  // Hooks

  // Setup
  const isCursor = input.executionBackend === 'cursor';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!isCursor) {
    return (
      <p className="text-muted-foreground text-xs">
        <code className="text-xs">--worktree-base</code> and{' '}
        <code className="text-xs">--skip-worktree-setup</code> apply only when
        the execution backend is Cursor.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="workflow-run-worktree-base">--worktree-base</Label>
        <Input
          aria-describedby="workflow-run-worktree-base-hint"
          aria-label="Base branch for cursor-agent --worktree-base"
          autoComplete="off"
          id="workflow-run-worktree-base"
          onChange={(e) =>
            setInput((prev) => ({
              ...prev,
              worktreeBase: e.target.value,
            }))
          }
          placeholder="e.g. main"
          spellCheck={false}
          value={input.worktreeBase}
        />
        <p
          className="text-muted-foreground text-xs"
          id="workflow-run-worktree-base-hint"
        >
          Cursor-only. Env:{' '}
          <code className="text-xs">
            {WORKFLOW_RALPH_ENV_VARS.worktreeBase}
          </code>
          ; empty omits the flag.
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 pt-2">
          <Switch
            aria-label="Enable --skip-worktree-setup for cursor-agent"
            checked={input.skipWorktreeSetup}
            id="workflow-run-skip-worktree-setup"
            onCheckedChange={(checked) =>
              setInput((prev) => ({
                ...prev,
                skipWorktreeSetup: checked === true,
              }))
            }
          />
          <Label htmlFor="workflow-run-skip-worktree-setup">
            --skip-worktree-setup
          </Label>
        </div>
        <p className="text-muted-foreground text-xs">
          Skip <code className="text-xs">.cursor/worktrees.json</code> setup
          scripts. Env:{' '}
          <code className="text-xs">
            {WORKFLOW_RALPH_ENV_VARS.skipWorktreeSetup}
          </code>
        </p>
      </div>
    </div>
  );
};
