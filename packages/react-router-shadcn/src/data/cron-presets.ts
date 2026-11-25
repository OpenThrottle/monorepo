/**
 * @description Common 5-field cron expressions offered by `InputCronExpression`,
 * plus the copy that control renders. Hoisted out of the component so a wording
 * or preset change touches one file and specs assert against the same constants.
 */

export interface CronPreset {
  /** Short human label shown in the preset menu. */
  readonly label: string;
  /** The 5-field cron expression written into the input when picked. */
  readonly value: string;
}

/**
 * @public
 * @description The preset cron expressions offered by {@link InputCronExpression}.
 * Ordered by increasing period so the menu reads shortest-interval first.
 */
export const CRON_PRESETS: readonly CronPreset[] = [
  { label: `Every hour`, value: `0 * * * *` },
  { label: `Every day at 09:00`, value: `0 9 * * *` },
  { label: `Every weekday at 09:00`, value: `0 9 * * 1-5` },
  { label: `Every Monday at 09:00`, value: `0 9 * * 1` },
  { label: `The 1st of every month at 09:00`, value: `0 9 1 * *` },
];

/**
 * @public
 * @description User-facing copy for {@link InputCronExpression}.
 */
export const CRON_EXPRESSION_COPY = {
  emptyHint: `Pick a preset or type a 5- or 6-field cron expression.`,
  invalid: `Invalid cron expression`,
  presetsLabel: `Presets`,
  presetsTrigger: `Cron presets`,
} as const;
