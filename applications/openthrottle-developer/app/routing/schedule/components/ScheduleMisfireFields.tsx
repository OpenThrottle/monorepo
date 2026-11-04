import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import {
  SCHEDULE_MISFIRE_DEFAULT_POLICY,
  SCHEDULE_MISFIRE_DEFAULT_THRESHOLD_MINUTES,
  SCHEDULE_MISFIRE_POLICY_OPTIONS,
} from '~/routing/schedule/data/data.misfire';

export interface ScheduleMisfireFieldsProps {
  /** The schedule's current policy; undefined on create (the server default applies). */
  misfirePolicy: string | undefined;
  /** The schedule's current grace period in ms; undefined on create. */
  misfireThresholdMs: number | undefined;
}

/**
 * @description What a schedule does with runs that start late: skip them, or run the latest one
 * once, plus the grace period before a run counts as late. The form posts minutes; the action
 * converts them to the server's milliseconds.
 */
export const ScheduleMisfireFields = (
  props: ScheduleMisfireFieldsProps,
): React.ReactElement => {
  const { misfirePolicy, misfireThresholdMs } = props;

  // Hooks

  // Setup
  const thresholdMinutes =
    misfireThresholdMs === undefined
      ? SCHEDULE_MISFIRE_DEFAULT_THRESHOLD_MINUTES
      : misfireThresholdMs / 60_000;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="ScheduleMisfireFields">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="misfirePolicy">
            {SCHEDULE_COPY.misfirePolicyLabel}
          </Label>
          <Select
            defaultValue={misfirePolicy ?? SCHEDULE_MISFIRE_DEFAULT_POLICY}
            name="misfirePolicy"
          >
            <SelectTrigger
              aria-label={SCHEDULE_COPY.misfirePolicyLabel}
              id="misfirePolicy"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_MISFIRE_POLICY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="misfireThresholdMinutes">
            {SCHEDULE_COPY.misfireThresholdLabel}
          </Label>
          <Input
            defaultValue={thresholdMinutes}
            id="misfireThresholdMinutes"
            min={1}
            name="misfireThresholdMinutes"
            step={1}
            type="number"
          />
        </div>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        {SCHEDULE_COPY.misfireHelp}
      </p>
    </div>
  );
};
