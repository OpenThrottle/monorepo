/**
 * @description Pure helpers for the OT Loop fields (validation command override, retry
 * count) shared by the Run dialog and the Configuration tab. Mirrors the OT Loop fields of the
 * `run` block of `runConfigJson` (docs/workflows/ot-loop-job.md § 1).
 */
import type { PlanRunConfigOtLoop } from '@openthrottle/openthrottle-plan-config';
import { MAX_PLAN_RUN_OT_LOOP_RETRIES } from '@openthrottle/openthrottle-plan-config';

/**
 * @description Form field the Run dialog sets on every submit that carries its OT Loop settings, so a
 * blank retries field and an empty command list (both dropped from the form) still clear the saved
 * values. The toolbar's one-click Run omits it and edits nothing.
 */
export const PLAN_RUN_OT_LOOP_SETTINGS_FIELD = 'otLoopSettings';

/** @description Retry count the runner uses when `run.maxRetries` is unset. */
export const DEFAULT_PLAN_RUN_OT_LOOP_RETRIES = 2;

/** @description One command per line to a list: trimmed, blank lines dropped. */
export const parseOtLoopCommandsText = (text: string): string[] => {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
};

/** @description A command list to the one-per-line text the textarea edits. */
export const formatOtLoopCommandsText = (
  commands: readonly string[] | undefined,
): string => {
  return (commands ?? []).join('\n');
};

/**
 * @description The retry count in its text field: `undefined` when blank (the default
 * applies), `null` when it is not a whole number from 0 to the schema maximum.
 */
export const parseOtLoopMaxRetriesText = (
  text: string,
): number | null | undefined => {
  const trimmed = text.trim();

  if (trimmed === '') {
    return undefined;
  }

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed);

  return value <= MAX_PLAN_RUN_OT_LOOP_RETRIES ? value : null;
};

/**
 * @description Applies the edited validation commands and retry count onto a stored
 * OT Loop fields, keeping its setup and final-validation commands. An empty command list
 * or blank retries removes that key; `undefined` when nothing is left.
 */
export const mergeOtLoopFields = (
  stored: PlanRunConfigOtLoop | undefined,
  fields: {
    readonly maxRetries: number | undefined;
    readonly validationCommands: readonly string[];
  },
): PlanRunConfigOtLoop | undefined => {
  const { maxRetries, validationCommands } = fields;
  const merged: PlanRunConfigOtLoop = {
    ...(stored?.finalValidationCommands !== undefined
      ? { finalValidationCommands: stored.finalValidationCommands }
      : {}),
    ...(maxRetries !== undefined ? { maxRetries } : {}),
    ...(stored?.setupCommands !== undefined
      ? { setupCommands: stored.setupCommands }
      : {}),
    ...(validationCommands.length > 0 ? { validationCommands } : {}),
  };

  return Object.keys(merged).length === 0 ? undefined : merged;
};
