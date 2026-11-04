import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { Label, Skeleton } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PlanDeferredSection } from '~/routing/plans/components/PlanDeferredSection';
import { PlanRunEffortControl } from '~/routing/plans/components/PlanRunEffortControl';
import { PlanRunModelPicker } from '~/routing/plans/components/PlanRunModelPicker';
import { PLAN_RUN_MODEL_EFFORT_COPY } from '~/routing/plans/data/data.copy';
import type { PlanRunModelSelection } from '~/routing/plans/utils/plan-run-model-effort';
import { reconcilePlanRunEffort } from '~/routing/plans/utils/plan-run-model-effort';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/workflow-ralph-config';

export interface PlanWorkflowConfigModelEffortProps {
  input: WorkflowRalphRunOptionsInput;

  /** @description The loader's deferred model discovery (cold-slow), so it only holds up the picker. */
  models: Promise<readonly ChatModelOption[]>;
  setInput: (
    updater: React.SetStateAction<WorkflowRalphRunOptionsInput>,
  ) => void;
}

/**
 * @description The Configuration tab's Model + Effort field pair. Writes the same
 * `ralph.model`, `ralph.executionBackend` and `ralph.effort` the Run dialog edits,
 * through the shared {@link PlanRunModelPicker} / {@link PlanRunEffortControl}.
 * Picking a model sets its runner too, and drops an effort the new runner
 * does not support.
 */
export const PlanWorkflowConfigModelEffort = (
  props: PlanWorkflowConfigModelEffortProps,
): React.ReactElement => {
  const { input, models, setInput } = props;

  // Hooks

  // Setup
  const copy = PLAN_RUN_MODEL_EFFORT_COPY;

  // Handlers
  const handleModelChange = (selection: PlanRunModelSelection): void => {
    setInput((prev) => ({
      ...prev,
      effort: reconcilePlanRunEffort(selection.backend, prev.effort),
      executionBackend: selection.backend,
      model: selection.model,
    }));
  };

  const handleEffortChange = (effort: string): void => {
    setInput((prev) => ({ ...prev, effort }));
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <div className="space-y-2">
        <Label>{copy.modelLabel}</Label>
        <PlanDeferredSection
          errorText={copy.modelsError}
          fallback={<Skeleton className="h-8 w-40" />}
          resolve={models}
        >
          {(resolvedModels) => (
            <PlanRunModelPicker
              backend={input.executionBackend}
              model={input.model}
              models={resolvedModels}
              onChange={handleModelChange}
            />
          )}
        </PlanDeferredSection>
        <p className="text-muted-foreground text-xs">{copy.modelHint}</p>
      </div>
      <div className="space-y-2">
        <Label>{copy.effortLabel}</Label>
        <div>
          <PlanRunEffortControl
            backend={input.executionBackend}
            effort={input.effort}
            onEffortChange={handleEffortChange}
          />
        </div>
        <p className="text-muted-foreground text-xs">{copy.effortHint}</p>
      </div>
    </>
  );
};
