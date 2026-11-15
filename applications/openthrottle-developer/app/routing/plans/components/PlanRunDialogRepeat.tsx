import {
  cn,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PLAN_RUN_REPEAT_COPY } from '~/routing/plans/data/data.copy';
import { PLAN_RUN_REPEAT_ORDER } from '~/routing/plans/data/data.plan-run-repeat';
import type { PlanRunDialogRepeatState } from '~/routing/plans/types';
import { isPlanRunRepeat } from '~/routing/plans/utils/plan-run-repeat';

export interface PlanRunDialogRepeatProps {
  readonly className?: string;
  readonly repeat: PlanRunDialogRepeatState;
}

/**
 * @description The Schedule tab's Repeat control: Does not repeat / Daily / Weekdays / Weekly /
 * Custom cron. Custom adds a cron text field. When the plan already repeats the select is
 * disabled and the hint names the existing rule (a plan carries one schedule). The readable rule
 * echoes underneath once the choice means a cron.
 */
export const PlanRunDialogRepeat = (
  props: PlanRunDialogRepeatProps,
): React.ReactElement => {
  const { className, repeat } = props;

  // Hooks
  const cronId = React.useId();

  // Setup
  const copy = PLAN_RUN_REPEAT_COPY;
  const isCustom = repeat.repeat === 'custom';
  const isDisabled = repeat.disabledReason !== undefined;

  // Handlers
  const handleValueChange = (value: string): void => {
    if (isPlanRunRepeat(value)) {
      repeat.onRepeatChange(value);
    }
  };

  // Markup
  const customField = (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={cronId}>{copy.customCronLabel}</Label>
      <Input
        aria-describedby={`${cronId}-hint`}
        aria-invalid={repeat.cronError !== undefined}
        className="w-56 font-mono"
        id={cronId}
        onChange={(event) => repeat.onCustomCronChange(event.target.value)}
        placeholder={copy.customCronPlaceholder}
        value={repeat.customCron}
      />
      <p className="text-muted-foreground text-xs" id={`${cronId}-hint`}>
        {repeat.cronError ?? copy.customCronHint}
      </p>
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      data-testid="PlanRunDialogRepeat"
    >
      <div className="flex flex-col gap-1.5">
        <Label>{copy.label}</Label>
        <Select
          disabled={isDisabled}
          onValueChange={handleValueChange}
          value={repeat.repeat}
        >
          <SelectTrigger aria-label={copy.label} className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_RUN_REPEAT_ORDER.map((value) => (
              <SelectItem key={value} value={value}>
                {copy.optionLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {repeat.disabledReason !== undefined && (
          <p
            className="text-muted-foreground text-xs"
            data-testid="PlanRunDialogRepeat-disabled-reason"
          >
            {repeat.disabledReason}
          </p>
        )}
      </div>
      {isCustom && customField}
      {repeat.summary !== undefined && (
        <p
          aria-live="polite"
          className="text-sm font-medium"
          data-testid="PlanRunDialogRepeat-summary"
        >
          {repeat.summary}
        </p>
      )}
    </div>
  );
};
