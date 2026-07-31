import * as React from 'react';
import { CardContent } from '@openthrottle/react-router-shadcn';
import { useAtomValue } from 'jotai';
import { workflowRalphRunOptionsValidationAtom } from '~/routing/plans/data/atom.plan';

export interface PlanTabConfigurationValidationProps {
  // className?: string;
}

/**
 * @description Blocking-issues alert for the Configuration tab. Reads the
 * route-scoped workflow-run-options validation atom (seeded by
 * {@link PlanRunConfigStoreProvider}) and renders the issue list when the
 * options are invalid. Extracted from {@link PlanTabConfiguration} per
 * component-primitive-shape R6.
 */
export const PlanTabConfigurationValidation = (
  _props: PlanTabConfigurationValidationProps,
): React.ReactElement => {
  // Hooks
  const validation = useAtomValue(workflowRalphRunOptionsValidationAtom);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-4 md:space-y-8">
      <CardContent className="flex flex-1 flex-col gap-4">
        {!validation.ok ? (
          <div
            className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            data-testid="workflow-run-validation"
            role="alert"
          >
            <p className="font-medium">Workflow options blocked until fixed</p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {validation.issues.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </div>
  );
};
