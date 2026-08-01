/**
 * @description Select-value guards for {@link PlanWorkflowConfigHookRow}'s
 * kind and on-failure dropdowns. Hoisted out of the component per
 * component-primitive-shape R4.
 */
import type {
  JobRunHookKind,
  JobRunHookOnFailure,
} from '~/routing/plans/utils/job-run-hooks-ui';

export const isJobRunHookKind = (value: string): value is JobRunHookKind =>
  value === 'prompt_profile' || value === 'skill';

export const isJobRunHookOnFailureValue = (
  value: string,
): value is JobRunHookOnFailure | 'default' =>
  value === 'block' ||
  value === 'default' ||
  value === 'ignore' ||
  value === 'warn';
