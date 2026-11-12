import { MAX_PLAN_RUN_OT_LOOP_RETRIES } from '@openthrottle/openthrottle-plan-config';
import { cn, Input, Label, TextArea } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PLAN_RUN_RUNNER_COPY } from '~/routing/plans/data/data.copy';
import { DEFAULT_PLAN_RUN_OT_LOOP_RETRIES } from '~/routing/plans/utils/plan-run-ot-loop';

export interface PlanRunOtLoopFieldsProps {
  readonly className?: string;
  readonly maxRetriesError: string | undefined;
  readonly maxRetriesText: string;
  readonly onMaxRetriesChange: (text: string) => void;
  readonly onValidationChange: (text: string) => void;
  readonly validationText: string;
}

/**
 * @description The OT Loop fields: the validation command override (one command per line;
 * empty means the repo file or Nx default) and the retry count. Fully controlled; the
 * caller trims and drops blank lines when it saves.
 */
export const PlanRunOtLoopFields = (
  props: PlanRunOtLoopFieldsProps,
): React.ReactElement => {
  const {
    className,
    maxRetriesError,
    maxRetriesText,
    onMaxRetriesChange,
    onValidationChange,
    validationText,
  } = props;

  // Hooks
  const baseId = React.useId();

  // Setup
  const copy = PLAN_RUN_RUNNER_COPY;
  const validationId = `${baseId}-validation`;
  const retriesId = `${baseId}-retries`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-col gap-4', className)}
      data-testid="PlanRunOtLoopFields"
    >
      <p className="text-muted-foreground text-xs">{copy.otLoopHelp}</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={validationId}>{copy.validationLabel}</Label>
        <TextArea
          aria-describedby={`${validationId}-hint`}
          autoCapitalize="off"
          autoCorrect="off"
          className="font-mono text-xs"
          id={validationId}
          onChange={(event) => onValidationChange(event.target.value)}
          placeholder={copy.validationPlaceholder}
          rows={3}
          spellCheck={false}
          value={validationText}
        />
        <p
          className="text-muted-foreground text-xs"
          id={`${validationId}-hint`}
        >
          {copy.validationHint}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={retriesId}>{copy.maxRetriesLabel}</Label>
        <Input
          aria-describedby={`${retriesId}-hint`}
          aria-invalid={maxRetriesError !== undefined}
          className="w-28"
          id={retriesId}
          inputMode="numeric"
          max={MAX_PLAN_RUN_OT_LOOP_RETRIES}
          min={0}
          onChange={(event) => onMaxRetriesChange(event.target.value)}
          placeholder={String(DEFAULT_PLAN_RUN_OT_LOOP_RETRIES)}
          step={1}
          type="number"
          value={maxRetriesText}
        />
        <p
          className={cn(
            'text-xs',
            maxRetriesError === undefined
              ? 'text-muted-foreground'
              : 'text-destructive',
          )}
          id={`${retriesId}-hint`}
        >
          {maxRetriesError ??
            copy.maxRetriesHint(
              DEFAULT_PLAN_RUN_OT_LOOP_RETRIES,
              MAX_PLAN_RUN_OT_LOOP_RETRIES,
            )}
        </p>
      </div>
    </div>
  );
};
