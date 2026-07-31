/**
 * @description Behavior for one {@link PlanWorkflowConfigHookRow}: derives the
 * row's select values and move-within-phase bounds, and owns every draft-list
 * mutation handler (remove, reorder, phase/kind/on-failure switches, timeout,
 * skill path, prompt fields, and prompt-delivery toggles). All updates go
 * through the parent `onChange` with a full next-rows array.
 */
import * as React from 'react';
import { DEFAULT_RALPH_PROMPT } from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  moveRowWithinPhase,
  updateRow,
} from '~/routing/plans/utils/job-run-hooks-draft';
import type {
  JobRunHookDraftRow,
  JobRunHookOnFailure,
} from '~/routing/plans/utils/job-run-hooks-ui';
import { isJobRunHookPhase } from '~/routing/plans/utils/job-run-hooks-ui';
import {
  isJobRunHookKind,
  isJobRunHookOnFailureValue,
} from '~/routing/plans/utils/plan-workflow-config-hook-row';

export interface PlanWorkflowConfigHookRowOptions {
  readonly hooks: readonly JobRunHookDraftRow[];
  readonly index: number;
  readonly onChange: (next: JobRunHookDraftRow[]) => void;
  readonly row: JobRunHookDraftRow;
}

export interface UsePlanWorkflowConfigHookRowResult {
  readonly canMoveDown: boolean;
  readonly canMoveUp: boolean;
  readonly handleKindChange: (value: string) => void;
  readonly handleMoveDown: () => void;
  readonly handleMoveUp: () => void;
  readonly handleOnFailureChange: (value: string) => void;
  readonly handlePhaseChange: (value: string) => void;
  readonly handlePromptChange: React.ChangeEventHandler<HTMLInputElement>;
  readonly handlePromptFileChange: React.ChangeEventHandler<HTMLInputElement>;
  readonly handleRemove: () => void;
  readonly handleSkillPathChange: React.ChangeEventHandler<HTMLInputElement>;
  readonly handleTimeoutChange: React.ChangeEventHandler<HTMLInputElement>;
  readonly handleUseFileDelivery: () => void;
  readonly handleUseNamedProfile: () => void;
  readonly kindValue: 'prompt_profile' | 'skill';
  readonly onFailureValue: JobRunHookOnFailure | 'default';
}

export const usePlanWorkflowConfigHookRow = (
  options: PlanWorkflowConfigHookRowOptions,
): UsePlanWorkflowConfigHookRowResult => {
  const { hooks, index, onChange, row } = options;

  // Hooks

  // Setup
  const kindValue = row.kind === 'skill' ? 'skill' : 'prompt_profile';
  const onFailureValue = row.onFailure ?? 'default';
  const phaseIndices = hooks
    .map((r, i) => (r.phase === row.phase ? i : -1))
    .filter((i) => i >= 0);
  const posInPhase = phaseIndices.indexOf(index);
  const canMoveUp = posInPhase > 0;
  const canMoveDown = posInPhase < phaseIndices.length - 1;

  // Handlers
  const handleRemove = (): void => {
    onChange(hooks.filter((r) => r.draftId !== row.draftId));
  };

  const handleMoveUp = (): void => {
    onChange(moveRowWithinPhase(hooks, row.draftId, -1));
  };

  const handleMoveDown = (): void => {
    onChange(moveRowWithinPhase(hooks, row.draftId, 1));
  };

  const handlePhaseChange = (value: string): void => {
    if (isJobRunHookPhase(value)) {
      onChange(updateRow(hooks, row.draftId, { phase: value }));
    }
  };

  const handleKindChange = (value: string): void => {
    if (!isJobRunHookKind(value)) return;

    const target = hooks.find((r) => r.draftId === row.draftId);
    if (target == null) return;

    const shared = {
      draftId: target.draftId,
      onFailure: target.onFailure,
      order: target.order,
      phase: target.phase,
      timeoutSeconds: target.timeoutSeconds,
    };

    if (value === 'skill') {
      onChange(
        hooks.map((r) =>
          r.draftId === row.draftId
            ? {
                ...shared,
                kind: 'skill' as const,
                skillPath: '.agents/skills/workflow-ralph/SKILL.md',
              }
            : r,
        ),
      );
      return;
    }

    onChange(
      hooks.map((r) =>
        r.draftId === row.draftId
          ? {
              ...shared,
              kind: 'prompt_profile' as const,
              prompt: DEFAULT_RALPH_PROMPT,
              promptDelivery: 'named' as const,
            }
          : r,
      ),
    );
  };

  const handleOnFailureChange = (value: string): void => {
    if (isJobRunHookOnFailureValue(value)) {
      onChange(
        updateRow(hooks, row.draftId, {
          onFailure: value === 'default' ? undefined : value,
        }),
      );
    }
  };

  const handleTimeoutChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const raw = event.target.value.trim();
    onChange(
      updateRow(hooks, row.draftId, {
        timeoutSeconds: raw === '' ? undefined : Number.parseInt(raw, 10),
      }),
    );
  };

  const handleSkillPathChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    onChange(
      updateRow(hooks, row.draftId, {
        skillPath: event.target.value,
      }),
    );
  };

  const handlePromptFileChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    onChange(
      updateRow(hooks, row.draftId, {
        promptFile: event.target.value,
      }),
    );
  };

  const handlePromptChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    onChange(
      updateRow(hooks, row.draftId, {
        prompt: event.target.value,
      }),
    );
  };

  const handleUseFileDelivery = (): void => {
    onChange(
      hooks.map((r) =>
        r.draftId === row.draftId
          ? {
              draftId: r.draftId,
              kind: 'prompt_profile' as const,
              onFailure: r.onFailure,
              order: r.order,
              phase: r.phase,
              promptDelivery: 'file' as const,
              promptFile: '',
              timeoutSeconds: r.timeoutSeconds,
            }
          : r,
      ),
    );
  };

  const handleUseNamedProfile = (): void => {
    onChange(
      hooks.map((r) =>
        r.draftId === row.draftId
          ? {
              draftId: r.draftId,
              kind: 'prompt_profile' as const,
              onFailure: r.onFailure,
              order: r.order,
              phase: r.phase,
              prompt: DEFAULT_RALPH_PROMPT,
              promptDelivery: 'named' as const,
              timeoutSeconds: r.timeoutSeconds,
            }
          : r,
      ),
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
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
  };
};
