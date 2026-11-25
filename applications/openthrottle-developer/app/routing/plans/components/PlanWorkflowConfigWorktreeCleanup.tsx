import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PLAN_CONFIG_WORKTREE_CLEANUP_COPY } from '~/routing/plans/data/copy';
import type {
  PlanRunOptions,
  PlanRunWorktreeCleanup,
} from '~/routing/plans/utils/plan-run-options';

export interface PlanWorkflowConfigWorktreeCleanupProps {
  input: PlanRunOptions;
  setInput: (updater: React.SetStateAction<PlanRunOptions>) => void;
}

export const PlanWorkflowConfigWorktreeCleanup = (
  props: PlanWorkflowConfigWorktreeCleanupProps,
): React.ReactElement => {
  const { input, setInput } = props;

  // Hooks

  // Setup
  const isKeep = input.worktreeCleanup === 'keep';
  const cleanupLabel = isKeep
    ? PLAN_CONFIG_WORKTREE_CLEANUP_COPY.keepLabel
    : PLAN_CONFIG_WORKTREE_CLEANUP_COPY.onPrLabel;

  // Handlers
  const handleValueChange = (value: string): void => {
    if (value !== 'keep' && value !== 'on-pr') return;
    const next: PlanRunWorktreeCleanup = value;
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
      <Select onValueChange={handleValueChange} value={input.worktreeCleanup}>
        <SelectTrigger
          aria-describedby="workflow-run-worktree-cleanup-hint"
          className="max-w-md"
          id="workflow-run-worktree-cleanup"
        >
          <SelectValue>{cleanupLabel}</SelectValue>
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
        {PLAN_CONFIG_WORKTREE_CLEANUP_COPY.hint}
      </p>
    </div>
  );
};
