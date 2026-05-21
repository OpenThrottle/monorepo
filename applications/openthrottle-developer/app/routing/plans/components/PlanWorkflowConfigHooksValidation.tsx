import * as React from 'react';
import { JobRunHooksUiValidation } from '~/routing/plans/utils/job-run-hooks-ui';

export interface PlanWorkflowConfigHooksValidationProps {
  validation: JobRunHooksUiValidation;
}

export const PlanWorkflowConfigHooksValidation = (
  props: PlanWorkflowConfigHooksValidationProps,
) => {
  const { validation } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (validation.ok) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      data-testid="job-run-hooks-validation"
      role="alert"
    >
      <p className="font-medium">Fix hook configuration</p>
      <ul className="mt-1 list-inside list-disc text-xs">
        {validation.issues.map((issue, index) => (
          <li key={`${issue}-${index}`}>{issue}</li>
        ))}
      </ul>
    </div>
  );
};
