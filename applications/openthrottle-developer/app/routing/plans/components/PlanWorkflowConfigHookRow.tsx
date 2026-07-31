import * as React from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Button } from '@openthrottle/react-router-shadcn';
import { PlanWorkflowConfigHookRowPrompt } from '~/routing/plans/components/PlanWorkflowConfigHookRowPrompt';
import { PlanWorkflowConfigHookRowSelects } from '~/routing/plans/components/PlanWorkflowConfigHookRowSelects';
import { usePlanWorkflowConfigHookRow } from '~/routing/plans/hooks/usePlanWorkflowConfigHookRow';
import type { JobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';

export interface PlanWorkflowConfigHookRowProps {
  hooks: readonly JobRunHookDraftRow[];
  index: number;
  onChange: (next: JobRunHookDraftRow[]) => void;
  row: JobRunHookDraftRow;
}

export const PlanWorkflowConfigHookRow = (
  props: PlanWorkflowConfigHookRowProps,
): React.ReactElement => {
  const { hooks, index, onChange, row } = props;

  // Hooks
  const {
    canMoveDown,
    canMoveUp,
    handleKindChange,
    handleMoveDown,
    handleMoveUp,
    handleOnFailureChange,
    handlePhaseChange,
    handlePromptChange,
    handlePromptFileChange,
    handleRemove,
    handleSkillPathChange,
    handleTimeoutChange,
    handleUseFileDelivery,
    handleUseNamedProfile,
    kindValue,
    onFailureValue,
  } = usePlanWorkflowConfigHookRow({ hooks, index, onChange, row });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li
      className="border-border space-y-3 rounded-lg border p-4"
      data-testid={`job-run-hook-row-${index}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Hook {index + 1}</span>

        <div className="flex items-center gap-1">
          <Button
            aria-label="Move hook up within phase"
            disabled={!canMoveUp}
            onClick={handleMoveUp}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowUp />
          </Button>
          <Button
            aria-label="Move hook down within phase"
            disabled={!canMoveDown}
            onClick={handleMoveDown}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowDown />
          </Button>
          <Button
            aria-label="Remove hook"
            onClick={handleRemove}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <PlanWorkflowConfigHookRowSelects
        kindValue={kindValue}
        onFailureChange={handleOnFailureChange}
        onFailureValue={onFailureValue}
        onKindChange={handleKindChange}
        onPhaseChange={handlePhaseChange}
        onTimeoutChange={handleTimeoutChange}
        row={row}
      />

      <PlanWorkflowConfigHookRowPrompt
        onPromptChange={handlePromptChange}
        onPromptFileChange={handlePromptFileChange}
        onSkillPathChange={handleSkillPathChange}
        onUseFileDelivery={handleUseFileDelivery}
        onUseNamedProfile={handleUseNamedProfile}
        row={row}
      />
    </li>
  );
};
