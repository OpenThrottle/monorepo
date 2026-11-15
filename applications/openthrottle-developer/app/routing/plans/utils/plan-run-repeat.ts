/**
 * @description Pure helpers behind Repeat: the cron a repeat choice means, the human-readable
 * rule (cronstrue), the overrides JSON a recurring schedule stores, and which schedule owns an
 * occurrence.
 */
import cronstrue from 'cronstrue';

import type { PlanRunScheduleFieldsFragment } from '~/__generated__/graphql';
import { PLAN_RUN_REPEAT_COPY } from '~/routing/plans/data/data.copy';
import type { PlanRunRepeat } from '~/routing/plans/types';
import type { PlanRunEnqueueFields } from '~/routing/plans/utils/plan-run-form';

const CRON_FIELD_COUNT = 5;

/** @description True when the text has the five whitespace-separated fields of a cron pattern. */
export const isCronPatternShape = (text: string): boolean => {
  return text.trim().split(/\s+/).length === CRON_FIELD_COUNT;
};

/**
 * @description The cron a Repeat choice means for the picked local date and time: Daily
 * `M H * * *`, Weekdays `M H * * 1-5`, Weekly `M H * * <weekday of the date>`. Custom returns
 * the trimmed text when it has five fields. `undefined` for `none`, no instant, or a bad cron.
 * The instant is read in the browser's local zone, the same zone sent as the timezone.
 */
export const buildRepeatCronPattern = (input: {
  readonly customCron: string;
  readonly instant: Date | undefined;
  readonly repeat: PlanRunRepeat;
}): string | undefined => {
  const { customCron, instant, repeat } = input;

  if (repeat === 'none') {
    return undefined;
  }

  if (repeat === 'custom') {
    return isCronPatternShape(customCron)
      ? customCron.trim().split(/\s+/).join(' ')
      : undefined;
  }

  if (instant === undefined) {
    return undefined;
  }

  const base = `${instant.getMinutes()} ${instant.getHours()} * *`;
  const weekdayByRepeat = {
    daily: '*',
    weekdays: '1-5',
    weekly: String(instant.getDay()),
  };

  return `${base} ${weekdayByRepeat[repeat]}`;
};

/**
 * @description "at 09:00 AM, Monday through Friday" for a cron pattern, or `undefined` when
 * cronstrue cannot read it.
 */
export const describeCronPattern = (cron: string): string | undefined => {
  try {
    const text = cronstrue.toString(cron, { verbose: false });

    return text.charAt(0).toLowerCase() + text.slice(1);
  } catch {
    return undefined;
  }
};

/**
 * @description The JSON a recurring schedule stores as per-occurrence overrides: only branch,
 * effort, iterations and model, and only the ones this run actually sets. `undefined` when none.
 */
export const buildRunOverridesJson = (
  fields: PlanRunEnqueueFields,
): string | undefined => {
  const overrides = {
    ...(fields.branch.trim() === '' ? {} : { branch: fields.branch }),
    ...(fields.ralph?.effort == null ? {} : { effort: fields.ralph.effort }),
    ...(fields.ralph?.iterations == null
      ? {}
      : { iterations: fields.ralph.iterations }),
    ...(fields.ralph?.model == null ? {} : { model: fields.ralph.model }),
  };

  return Object.keys(overrides).length === 0
    ? undefined
    : JSON.stringify(overrides);
};

/**
 * @description The schedule whose pending occurrence is this run, or `undefined` for a one-off
 * or manual run.
 */
export const selectScheduleForRun = (
  schedules: readonly PlanRunScheduleFieldsFragment[],
  planRunId: string,
): PlanRunScheduleFieldsFragment | undefined => {
  return schedules.find((schedule) => schedule.pendingPlanRunId === planRunId);
};

/** @description The enabled schedule, if any; a plan has at most one. */
export const selectEnabledSchedule = (
  schedules: readonly PlanRunScheduleFieldsFragment[],
): PlanRunScheduleFieldsFragment | undefined => {
  return schedules.find((schedule) => schedule.enabled);
};

/** @description The readable rule for a schedule, falling back to its raw cron. */
export const describeRunSchedule = (
  schedule: PlanRunScheduleFieldsFragment,
): string => {
  return describeCronPattern(schedule.cronPattern) ?? schedule.cronPattern;
};

/**
 * @description Why Repeat cannot be chosen: the plan already has an enabled schedule, and a
 * second one would double-fire. Names the existing rule. `undefined` when Repeat is free.
 */
export const getRepeatDisabledReason = (
  schedules: readonly PlanRunScheduleFieldsFragment[],
): string | undefined => {
  const existing = selectEnabledSchedule(schedules);

  return existing === undefined
    ? undefined
    : PLAN_RUN_REPEAT_COPY.existingHint(describeRunSchedule(existing));
};

/** @description Type predicate for a Repeat select value. */
export const isPlanRunRepeat = (value: string): value is PlanRunRepeat => {
  return Object.hasOwn(PLAN_RUN_REPEAT_COPY.optionLabels, value);
};
