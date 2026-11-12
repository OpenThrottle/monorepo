import type { PlanRunConfigRunner } from '@openthrottle/openthrottle-plan-config';
import type { ChatModelOption } from '@openthrottle/react-router-chat';
import {
  Badge,
  cn,
  Input,
  Label,
  Skeleton,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PlanDeferredSection } from '~/routing/plans/components/PlanDeferredSection';
import { PlanRunEffortControl } from '~/routing/plans/components/PlanRunEffortControl';
import { PlanRunModelPicker } from '~/routing/plans/components/PlanRunModelPicker';
import { PlanRunOtLoopFields } from '~/routing/plans/components/PlanRunOtLoopFields';
import { PlanRunRunnerField } from '~/routing/plans/components/PlanRunRunnerField';
import {
  PLAN_RUN_DIALOG_COPY,
  PLAN_RUN_MODEL_EFFORT_COPY,
} from '~/routing/plans/data/data.copy';
import type { PlanRunModelSelection } from '~/routing/plans/utils/plan-run-model-effort';
import type { WorkflowRalphExecutionBackendUi } from '~/routing/plans/utils/workflow-ralph-config';

export interface PlanRunDialogSettingsProps {
  readonly backend: WorkflowRalphExecutionBackendUi;
  readonly className?: string;
  readonly effort: string;
  readonly iterationsError: string | undefined;
  readonly iterationsText: string;
  readonly model: string;

  /** @description The loader's deferred model discovery; only the picker waits on it. */
  readonly models: Promise<readonly ChatModelOption[]>;
  readonly onEffortChange: (effort: string) => void;
  readonly onIterationsChange: (iterationsText: string) => void;
  readonly onModelChange: (selection: PlanRunModelSelection) => void;
  readonly onOtLoopMaxRetriesChange: (text: string) => void;
  readonly onOtLoopValidationChange: (text: string) => void;
  readonly onRunnerChange: (runner: PlanRunConfigRunner) => void;
  readonly otLoopMaxRetriesError: string | undefined;
  readonly otLoopMaxRetriesText: string;
  readonly otLoopValidationText: string;

  /** @description The plan's configured iterations, named in the "resets to" hint. */
  readonly planIterations: number;
  readonly runner: PlanRunConfigRunner;
}

/**
 * @description The Run dialog's settings: the runner (Ralph | OT Loop), model + effort,
 * labeled as PLAN settings (the action saves them to the run config), then either
 * iterations (Ralph; this run only) or the OT Loop validation override and retries. Reuses the Configuration tab's {@link PlanRunModelPicker} and
 * {@link PlanRunEffortControl}, so both surfaces edit the same fields.
 */
export const PlanRunDialogSettings = (
  props: PlanRunDialogSettingsProps,
): React.ReactElement => {
  const {
    backend,
    className,
    effort,
    iterationsError,
    iterationsText,
    model,
    models,
    onEffortChange,
    onIterationsChange,
    onModelChange,
    onOtLoopMaxRetriesChange,
    onOtLoopValidationChange,
    onRunnerChange,
    otLoopMaxRetriesError,
    otLoopMaxRetriesText,
    otLoopValidationText,
    planIterations,
    runner,
  } = props;

  // Hooks
  const iterationsId = React.useId();

  // Setup
  const copy = PLAN_RUN_DIALOG_COPY;
  const fieldCopy = PLAN_RUN_MODEL_EFFORT_COPY;

  // Handlers

  // Markup
  const iterationsField = (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={iterationsId}>{copy.iterationsLabel}</Label>
        <Badge variant="outline">{copy.iterationsScope}</Badge>
      </div>
      <Input
        aria-describedby={`${iterationsId}-hint`}
        aria-invalid={iterationsError !== undefined}
        className="w-28"
        id={iterationsId}
        inputMode="numeric"
        min={1}
        onChange={(event) => onIterationsChange(event.target.value)}
        step={1}
        type="number"
        value={iterationsText}
      />
      <p className="text-muted-foreground text-xs" id={`${iterationsId}-hint`}>
        {copy.iterationsHint(planIterations)}
      </p>
    </div>
  );

  const otLoopFields = (
    <PlanRunOtLoopFields
      maxRetriesError={otLoopMaxRetriesError}
      maxRetriesText={otLoopMaxRetriesText}
      onMaxRetriesChange={onOtLoopMaxRetriesChange}
      onValidationChange={onOtLoopValidationChange}
      validationText={otLoopValidationText}
    />
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-col gap-4', className)}
      data-testid="PlanRunDialogSettings"
    >
      <PlanRunRunnerField onRunnerChange={onRunnerChange} runner={runner} />
      <section
        aria-labelledby={`${iterationsId}-plan`}
        className="border-border flex flex-col gap-3 rounded-lg border border-dashed p-3"
      >
        <h3
          className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
          id={`${iterationsId}-plan`}
        >
          {copy.planSettingsHeading}
        </h3>
        <p className="text-xs" data-testid="PlanRunDialogSettings-plan-notice">
          {copy.planSettingsNotice}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <div className="flex flex-col gap-1.5">
            <Label>{fieldCopy.modelLabel}</Label>
            <PlanDeferredSection
              errorText={fieldCopy.modelsError}
              fallback={<Skeleton className="h-8 w-40" />}
              resolve={models}
            >
              {(resolvedModels) => (
                <PlanRunModelPicker
                  backend={backend}
                  model={model}
                  models={resolvedModels}
                  onChange={onModelChange}
                />
              )}
            </PlanDeferredSection>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{fieldCopy.effortLabel}</Label>
            <div>
              <PlanRunEffortControl
                backend={backend}
                effort={effort}
                onEffortChange={onEffortChange}
              />
            </div>
          </div>
        </div>
      </section>

      {runner === 'ot-loop' ? otLoopFields : iterationsField}
    </div>
  );
};
