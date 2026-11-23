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
import type { PlanRunDriverUi } from '~/routing/plans/utils/plan-run-options';

export interface PlanRunModelPickerProps {
  className?: string;
  /** @description The plan's stored agent driver. */
  driver: PlanRunDriverUi;

  /** @description The plan's stored model. */
  model: string;

  /** @description Discovered agent+model options (the same list `useRunSkillDialog` consumes). */
  models: readonly ChatModelOption[];

  /** @description Picking a model writes its model id AND the runner it belongs to. */
  onChange: (selection: PlanRunModelSelection) => void;
}

/**
 * @description State-free model picker for plan runs, shared by the Configuration
 * tab and the Run dialog so both edit the same model and driver.
 * Wraps `ChatModelPicker` over the options a plan can actually run; because a
 * discovered option id already names its runner (`cursor|gpt-5.2`), one pick
 * keeps model and driver consistent.
 */
export const PlanRunModelPicker = (
  props: PlanRunModelPickerProps,
): React.ReactElement => {
  const { driver, className, model, models, onChange } = props;

  // Hooks

  // Setup
  const copy = PLAN_RUN_MODEL_EFFORT_COPY;
  const runnableModels = filterPlanRunnableModels(models);
  const groups = buildModelGroups(runnableModels);
  const selectedModelId = toPlanRunModelOptionId(driver, model, runnableModels);

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
