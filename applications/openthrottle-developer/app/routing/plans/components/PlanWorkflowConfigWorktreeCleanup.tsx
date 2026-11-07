import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PLAN_CONFIG_WORKTREE_CLEANUP_COPY } from '~/routing/plans/data/data.copy';
import type {
  WorkflowRalphRunOptionsInput,
  WorkflowRalphWorktreeCleanup,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanWorkflowConfigWorktreeCleanupProps {
  input: WorkflowRalphRunOptionsInput;
  setInput: (
    updater: React.SetStateAction<WorkflowRalphRunOptionsInput>,
  ) => void;
}

export const PlanWorkflowConfigWorktreeCleanup = (
  props: PlanWorkflowConfigWorktreeCleanupProps,
): React.ReactElement => {
  const { input, setInput } = props;

  // Hooks

  // Setup
  const isWorktreeOff = input.worktreeCli === 'omit';
  const hint = isWorktreeOff
    ? PLAN_CONFIG_WORKTREE_CLEANUP_COPY.disabledHint
    : PLAN_CONFIG_WORKTREE_CLEANUP_COPY.hint;

  // Handlers
  const handleValueChange = (value: string): void => {
    if (value !== 'keep' && value !== 'on-pr') return;
    const next: WorkflowRalphWorktreeCleanup = value;
    setInput((prev) => ({ ...prev, worktreeCleanup: next }));
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-2" data-testid="PlanWorkflowConfigWorktreeCleanup">
      <Label htmlFor="workflow-run-worktree-cleanup">
        {PLAN_CONFIG_WORKTREE_CLEANUP_COPY.label}
      </Label>
      <Select
        disabled={isWorktreeOff}
        onValueChange={handleValueChange}
        value={input.worktreeCleanup}
      >
        <SelectTrigger
          aria-describedby="workflow-run-worktree-cleanup-hint"
          className="max-w-md"
          id="workflow-run-worktree-cleanup"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="on-pr">
            {PLAN_CONFIG_WORKTREE_CLEANUP_COPY.onPrLabel}
          </SelectItem>
          <SelectItem value="keep">
            {PLAN_CONFIG_WORKTREE_CLEANUP_COPY.keepLabel}
          </SelectItem>
        </SelectContent>
      </Select>
      <p
        className="text-muted-foreground text-xs"
        id="workflow-run-worktree-cleanup-hint"
      >
        {hint}
      </p>
    </div>
  );
};
