import {
  describeScheduleInstant,
  getScheduleInstantError,
} from '~/routing/plans/utils/plan-run-schedule';

export interface PlanRunDialogScheduleFeedbackInput {
  readonly instant: Date | undefined;
  readonly isScheduleMode: boolean;
  readonly now: Date;
}

export interface PlanRunDialogScheduleFeedback {
  /** @description Why the picked instant is unusable; `null` outside schedule mode or when valid. */
  readonly scheduleError: string | null;
  /** @description "fires 3:00 PM PST, in about 4 hours"; `undefined` until a future instant is picked. */
  readonly scheduleSummary: string | undefined;
}

export const getPlanRunDialogScheduleFeedback = (
  input: PlanRunDialogScheduleFeedbackInput,
): PlanRunDialogScheduleFeedback => {
  const { instant, isScheduleMode, now } = input;

  if (!isScheduleMode) {
    return { scheduleError: null, scheduleSummary: undefined };
  }

  const scheduleError = getScheduleInstantError(instant, now);
  if (instant === undefined || instant <= now) {
    return { scheduleError, scheduleSummary: undefined };
  }

  return {
    scheduleError,
    scheduleSummary: describeScheduleInstant(instant, now),
  };
};
