import {
  Input,
  InputCronExpression,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { ScheduledJobDetailFragment } from '~/__generated__/graphql';
import { ScheduleMisfireFields } from '~/routing/schedule/components/ScheduleMisfireFields';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import {
  SCHEDULE_INTERVAL_DEFAULT_MINUTES,
  SCHEDULE_KIND,
  SCHEDULE_KIND_OPTIONS,
  type ScheduleKind,
} from '~/routing/schedule/data/data.schedule-kind';

export interface ScheduleKindFieldsProps {
  /** The schedule being edited; undefined on create, which starts on cron. */
  job:
    | Pick<
        ScheduledJobDetailFragment,
        | 'cronPattern'
        | 'intervalMs'
        | 'misfirePolicy'
        | 'misfireThresholdMs'
        | 'runAt'
        | 'scheduleKind'
      >
    | undefined;
}

/**
 * @description When a schedule runs: a kind picker (cron, interval, once) and the one field that kind
 * needs. Only the chosen kind's field is rendered, so the form posts only that one. A cron schedule
 * also gets the late-run (misfire) settings; an interval or once run the server was down for runs
 * once, late, so they have none.
 */
export const ScheduleKindFields = (
  props: ScheduleKindFieldsProps,
): React.ReactElement => {
  const { job } = props;

  // Hooks
  const [kind, setKind] = React.useState<ScheduleKind>(
    SCHEDULE_KIND_OPTIONS.find((option) => option.value === job?.scheduleKind)
      ?.value ?? SCHEDULE_KIND.cron,
  );

  // Setup
  const intervalMinutes =
    job?.intervalMs == null
      ? SCHEDULE_INTERVAL_DEFAULT_MINUTES
      : job.intervalMs / 60_000;
  const runAt = typeof job?.runAt === 'string' ? job.runAt : '';

  // Handlers
  const handleKindChange = (value: string): void => {
    const next = SCHEDULE_KIND_OPTIONS.find((option) => option.value === value);
    if (next) setKind(next.value);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-4" data-testid="ScheduleKindFields">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="scheduleKind">{SCHEDULE_COPY.kindLabel}</Label>
          <Select
            name="scheduleKind"
            onValueChange={handleKindChange}
            value={kind}
          >
            <SelectTrigger
              aria-label={SCHEDULE_COPY.kindLabel}
              id="scheduleKind"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_KIND_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {kind === SCHEDULE_KIND.cron ? (
          <div>
            <Label htmlFor="cronPattern">{SCHEDULE_COPY.cronLabel}</Label>
            <InputCronExpression
              defaultValue={job?.cronPattern ?? undefined}
              id="cronPattern"
              name="cronPattern"
              placeholder="0 9 * * *"
              required={true}
            />
          </div>
        ) : null}

        {kind === SCHEDULE_KIND.interval ? (
          <div>
            <Label htmlFor="intervalMinutes">
              {SCHEDULE_COPY.intervalLabel}
            </Label>
            <Input
              defaultValue={intervalMinutes}
              id="intervalMinutes"
              min={1}
              name="intervalMinutes"
              required={true}
              step={1}
              type="number"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              {SCHEDULE_COPY.intervalHelp}
            </p>
          </div>
        ) : null}

        {kind === SCHEDULE_KIND.once ? (
          <div>
            <Label htmlFor="runAt">{SCHEDULE_COPY.runAtLabel}</Label>
            <Input
              defaultValue={runAt}
              id="runAt"
              name="runAt"
              placeholder="2026-11-03T09:00:00-08:00"
              required={true}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              {SCHEDULE_COPY.runAtHelp}
            </p>
          </div>
        ) : null}
      </div>

      {kind === SCHEDULE_KIND.cron ? (
        <ScheduleMisfireFields
          misfirePolicy={job?.misfirePolicy}
          misfireThresholdMs={job?.misfireThresholdMs}
        />
      ) : null}
    </div>
  );
};
