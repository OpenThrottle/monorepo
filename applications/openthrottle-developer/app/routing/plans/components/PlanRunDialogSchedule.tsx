import {
  cn,
  DatePicker,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import { ClockIcon } from 'lucide-react';
import * as React from 'react';

import { PLAN_RUN_DIALOG_COPY } from '~/routing/plans/data/data.copy';

export interface PlanRunDialogScheduleProps {
  readonly className?: string;
  readonly date: Date | undefined;

  /** @description Why the picked instant cannot be scheduled (past, too far, invalid), if so. */
  readonly error: string | null;
  readonly onDateChange: (date: Date | undefined) => void;
  readonly onTimeChange: (time: string) => void;

  /** @description Plain-language echo of the picked instant, once it is in the future. */
  readonly summary: string | undefined;

  /** @description `HH:mm`, 24-hour, in the browser's local zone. */
  readonly time: string;

  /** @description IANA zone the date and time are read in, shown so it is never implicit. */
  readonly timeZone: string;
}

/**
 * @description The Run dialog's Schedule tab body: a date + time picker in the browser's
 * local zone (labeled as such), the echoed fire time, and the client-side range error.
 * The server enforces the same future-and-30-days rule; this only tells the user first.
 */
export const PlanRunDialogSchedule = (
  props: PlanRunDialogScheduleProps,
): React.ReactElement => {
  const {
    className,
    date,
    error,
    onDateChange,
    onTimeChange,
    summary,
    time,
    timeZone,
  } = props;

  // Hooks
  const timeId = React.useId();

  // Setup
  const copy = PLAN_RUN_DIALOG_COPY;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      data-testid="PlanRunDialogSchedule"
    >
      <p
        className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium"
        data-testid="PlanRunDialogSchedule-zone"
      >
        <ClockIcon aria-hidden={true} className="size-3.5" />
        {copy.scheduleTimeZoneLabel(timeZone)}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>{copy.scheduleDateLabel}</Label>
          <DatePicker
            className="w-48"
            onSelect={onDateChange}
            placeholder={copy.scheduleDatePlaceholder}
            value={date}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={timeId}>{copy.scheduleTimeLabel}</Label>
          <Input
            aria-invalid={error !== null}
            className="w-32"
            id={timeId}
            onChange={(event) => onTimeChange(event.target.value)}
            type="time"
            value={time}
          />
        </div>
      </div>
      {summary !== undefined && (
        <p
          aria-live="polite"
          className="text-sm font-medium"
          data-testid="PlanRunDialogSchedule-summary"
        >
          {summary}
        </p>
      )}
      {error !== null && (
        <p
          className="text-destructive text-sm"
          data-testid="PlanRunDialogSchedule-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};
