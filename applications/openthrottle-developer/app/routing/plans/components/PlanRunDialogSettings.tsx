import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { cn, Label, Skeleton } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PlanDeferredSection } from '~/routing/plans/components/PlanDeferredSection';
import { PlanRunEffortControl } from '~/routing/plans/components/PlanRunEffortControl';
import { PlanRunModelPicker } from '~/routing/plans/components/PlanRunModelPicker';
import { PlanRunOtLoopFields } from '~/routing/plans/components/PlanRunOtLoopFields';
import {
  PLAN_RUN_DIALOG_COPY,
  PLAN_RUN_MODEL_EFFORT_COPY,
} from '~/routing/plans/data/data.copy';
import type { PlanRunModelSelection } from '~/routing/plans/utils/plan-run-model-effort';
import type { PlanRunDriverUi } from '~/routing/plans/utils/plan-run-options';

export interface PlanRunDialogSettingsProps {
  readonly className?: string;
  readonly driver: PlanRunDriverUi;
  readonly effort: string;
  readonly model: string;

  /** @description The loader's deferred model discovery; only the picker waits on it. */
  readonly models: Promise<readonly ChatModelOption[]>;
  readonly onEffortChange: (effort: string) => void;
  readonly onModelChange: (selection: PlanRunModelSelection) => void;
  readonly onOtLoopMaxRetriesChange: (text: string) => void;
  readonly onOtLoopValidationChange: (text: string) => void;
  readonly otLoopMaxRetriesError: string | undefined;
  readonly otLoopMaxRetriesText: string;
  readonly otLoopValidationText: string;
}

/**
 * @description The Run dialog's settings: model + effort, labeled as PLAN settings (the action
 * saves them to the run config), then the OT Loop validation override and retries. Reuses the
 * Configuration tab's {@link PlanRunModelPicker} and
 * {@link PlanRunEffortControl}, so both surfaces edit the same fields.
 */
export const PlanRunDialogSettings = (
  props: PlanRunDialogSettingsProps,
): React.ReactElement => {
  const {
    driver,
    className,
    effort,
    model,
    models,
    onEffortChange,
    onModelChange,
    onOtLoopMaxRetriesChange,
    onOtLoopValidationChange,
    otLoopMaxRetriesError,
    otLoopMaxRetriesText,
    otLoopValidationText,
  } = props;

  // Hooks
  const sectionId = React.useId();

  // Setup
  const copy = PLAN_RUN_DIALOG_COPY;
  const fieldCopy = PLAN_RUN_MODEL_EFFORT_COPY;

  // Handlers

  // Markup
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
      <section
        aria-labelledby={`${sectionId}-plan`}
        className="border-border flex flex-col gap-3 rounded-lg border border-dashed p-3"
      >
        <h3
          className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
          id={`${sectionId}-plan`}
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
                  driver={driver}
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
                driver={driver}
                effort={effort}
                onEffortChange={onEffortChange}
              />
            </div>
          </div>
        </div>
      </section>

      {otLoopFields}
    </div>
  );
};
