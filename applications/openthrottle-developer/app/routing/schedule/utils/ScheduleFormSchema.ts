import { coerceBoolean } from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';

import { SCHEDULE_REPOSITORY_NONE_VALUE } from '~/routing/schedule/data/data.repositories';

import type { ParsedScheduleForm } from './parse-form';

/** {@link ParsedScheduleForm} with the three always-required fields guaranteed. */
export interface ValidatedScheduleForm extends ParsedScheduleForm {
  readonly driverId: string;
  readonly name: string;
  readonly prompt: string;
}

/** A minutes string as whole milliseconds; blank or non-numeric becomes undefined. */
const minutesToMs = (value: string | undefined): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const minutes = Number(value);

  return Number.isFinite(minutes) ? Math.round(minutes * 60_000) : undefined;
};

/** A numeric string as a finite number; blank or non-numeric becomes undefined. */
const toFiniteNumber = (value: string | undefined): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
};

const ScheduleFormFieldsSchema = z.object({
  cronPattern: z.string().optional(),
  cwd: z.string().optional(),
  driverId: z.string().min(1),
  enabled: coerceBoolean(z.boolean().default(false)),
  intervalMinutes: z.string().optional(),
  misfirePolicy: z.string().optional(),
  misfireThresholdMinutes: z.string().optional(),
  model: z.string().optional(),
  name: z.string().min(1),
  prompt: z.string().min(1),
  repositoryCheckoutId: z.string().optional(),
  runAt: z.string().optional(),
  scheduleKind: z.string().optional(),
  settingsJson: z.string().optional(),
  timeoutMs: z.string().optional(),
  timezone: z.string().optional(),
});

/**
 * @description Zod schema for the schedule create form, run through
 * `parseFormData`. Output matches {@link ParsedScheduleForm}: minute fields
 * become milliseconds, a non-numeric timeout is dropped, and the picker's
 * "workspace default" sentinel (or blank) becomes a null checkout id.
 */
export const ScheduleFormSchema = ScheduleFormFieldsSchema.transform(
  (fields): ValidatedScheduleForm => {
    const isDefaultRepository =
      fields.repositoryCheckoutId === undefined ||
      fields.repositoryCheckoutId === SCHEDULE_REPOSITORY_NONE_VALUE;

    return {
      cronPattern: fields.cronPattern,
      cwd: fields.cwd,
      driverId: fields.driverId,
      enabled: fields.enabled,
      intervalMs: minutesToMs(fields.intervalMinutes),
      misfirePolicy: fields.misfirePolicy,
      misfireThresholdMs: minutesToMs(fields.misfireThresholdMinutes),
      model: fields.model,
      name: fields.name,
      prompt: fields.prompt,
      repositoryCheckoutId: isDefaultRepository
        ? null
        : fields.repositoryCheckoutId,
      runAt: fields.runAt,
      scheduleKind: fields.scheduleKind,
      settingsJson: fields.settingsJson,
      timeoutMs: toFiniteNumber(fields.timeoutMs),
      timezone: fields.timezone,
    };
  },
);
