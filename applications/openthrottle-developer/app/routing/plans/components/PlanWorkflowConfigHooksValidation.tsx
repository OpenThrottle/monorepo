import * as React from 'react';
import type { JobRunHooksUiValidation } from '~/routing/plans/utils/job-run-hooks-ui';

export interface PlanWorkflowConfigHooksValidationProps {
  validation: JobRunHooksUiValidation;
}

export const PlanWorkflowConfigHooksValidation = (
  props: PlanWorkflowConfigHooksValidationProps,
): React.ReactElement | null => {
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
      className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
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
