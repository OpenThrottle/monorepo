export interface PlanToolbarRunFieldsInput {
  readonly branch: string | undefined;
  readonly checkoutId: string | undefined;
  readonly jobRunHooksJson: string;
  readonly repositoryId: string | undefined;
  readonly runTuningJson: string;
  readonly workingDirectory: string | undefined;
}

/**
 * @description The fields of the toolbar's one-click Run (`runPlan`) form: the intent, the tuning
 * JSON (always sent, even blank) and whichever of branch, checkout, repository, working directory
 * and hooks are set. One source for both the form's hidden inputs and the confirmed re-submit, so
 * "Unschedule and run now" runs exactly what the plain click would have.
 */
export const buildPlanToolbarRunFields = (
  input: PlanToolbarRunFieldsInput,
): Readonly<Record<string, string>> => {
  const optional: readonly (readonly [string, string | undefined])[] = [
    ['branch', input.branch],
    ['checkoutId', input.checkoutId],
    ['jobRunHooksJson', input.jobRunHooksJson],
    ['repositoryId', input.repositoryId],
    ['workingDirectory', input.workingDirectory],
  ];

  return {
    intent: 'runPlan',
    runTuning: input.runTuningJson,
    ...Object.fromEntries(
      optional.filter(
        (entry): entry is readonly [string, string] =>
          entry[1] !== undefined && entry[1] !== '',
      ),
    ),
  };
};
