import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { ChatModelPicker } from '@openthrottle/react-router-chat';
import { buildModelGroups } from '@openthrottle/react-router-chat-state';
import * as React from 'react';

import { PLAN_RUN_MODEL_EFFORT_COPY } from '~/routing/plans/data/data.copy';
import type { PlanRunModelSelection } from '~/routing/plans/utils/plan-run-model-effort';
import {
  filterPlanRunnableModels,
  parsePlanRunModelOptionId,
  toPlanRunModelOptionId,
} from '~/routing/plans/utils/plan-run-model-effort';
import type { WorkflowRalphExecutionBackendUi } from '~/routing/plans/utils/workflow-ralph-config';

export interface PlanRunModelPickerProps {
  /** @description Stored `runConfigJson.ralph.executionBackend`. */
  backend: WorkflowRalphExecutionBackendUi;
  className?: string;

  /** @description Stored `runConfigJson.ralph.model`. */
  model: string;

  /** @description Discovered agent+model options (the same list `useRunSkillDialog` consumes). */
  models: readonly ChatModelOption[];

  /** @description Picking a model writes its model id AND the runner it belongs to. */
  onChange: (selection: PlanRunModelSelection) => void;
}

/**
 * @description State-free model picker for plan runs, shared by the Configuration
 * tab and the Run dialog so both edit the same `ralph.model` / `ralph.executionBackend`.
 * Wraps `ChatModelPicker` over the options a plan can actually run; because a
 * discovered option id already names its runner (`cursor|gpt-5.2`), one pick
 * keeps model and backend consistent.
 */
export const PlanRunModelPicker = (
  props: PlanRunModelPickerProps,
): React.ReactElement => {
  const { backend, className, model, models, onChange } = props;

  // Hooks

  // Setup
  const copy = PLAN_RUN_MODEL_EFFORT_COPY;
  const runnableModels = filterPlanRunnableModels(models);
  const groups = buildModelGroups(runnableModels);
  const selectedModelId = toPlanRunModelOptionId(
    backend,
    model,
    runnableModels,
  );

  // Handlers
  const handleModelChange = (optionId: string): void => {
    const selection = parsePlanRunModelOptionId(optionId);

    if (selection !== null) {
      onChange(selection);
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (runnableModels.length === 0) {
    return (
      <p
        className="text-muted-foreground text-sm"
        data-testid="PlanRunModelPicker-empty"
      >
        {copy.noModelsNotice}
      </p>
    );
  }

  return (
    <div data-testid="PlanRunModelPicker">
      <ChatModelPicker
        className={className}
        groups={groups}
        models={runnableModels}
        onModelChange={handleModelChange}
        selectedModelId={selectedModelId}
      />
    </div>
  );
};
