import { MAX_PLAN_RUN_OT_LOOP_RETRIES } from '@openthrottle/openthrottle-plan-config';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { useAtom } from 'jotai';
import * as React from 'react';

import { PlanRunOtLoopFields } from '~/routing/plans/components/PlanRunOtLoopFields';
import { workflowOtLoopAtom } from '~/routing/plans/data/atom-plan';
import { PLAN_RUN_OT_LOOP_COPY } from '~/routing/plans/data/copy';
import {
  formatOtLoopCommandsText,
  mergeOtLoopFields,
  parseOtLoopCommandsText,
  parseOtLoopMaxRetriesText,
} from '~/routing/plans/utils/plan-run-ot-loop';

export interface PlanWorkflowConfigValidationProps {
  readonly className?: string;
  readonly heading: string;
}

/**
 * @description Configuration tab section: the OT Loop validation override and retry count.
 * Reads and writes the route-scoped `workflowOtLoopAtom`, which `runConfigJson` serializes
 * on save.
 */
export const PlanWorkflowConfigValidation = (
  props: PlanWorkflowConfigValidationProps,
): React.ReactElement => {
  const { className, heading } = props;

  // Hooks
  const [otLoop, setOtLoop] = useAtom(workflowOtLoopAtom);
  const [validationText, setValidationText] = React.useState(() =>
    formatOtLoopCommandsText(otLoop?.validationCommands),
  );
  const [retriesText, setRetriesText] = React.useState(() =>
    otLoop?.maxRetries === undefined ? '' : String(otLoop.maxRetries),
  );

  // Setup
  const retries = parseOtLoopMaxRetriesText(retriesText);
  const invalidCopy = PLAN_RUN_OT_LOOP_COPY.maxRetriesInvalid(
    MAX_PLAN_RUN_OT_LOOP_RETRIES,
  );
  const retriesError = retries === null ? invalidCopy : undefined;
  // A half-typed invalid count keeps the last good one rather than clearing it.
  const effectiveRetries = retries === null ? otLoop?.maxRetries : retries;

  // Handlers
  const handleValidationChange = (text: string): void => {
    setValidationText(text);
    setOtLoop(
      mergeOtLoopFields(otLoop, {
        maxRetries: effectiveRetries,
        validationCommands: parseOtLoopCommandsText(text),
      }),
    );
  };

  const handleRetriesChange = (text: string): void => {
    const next = parseOtLoopMaxRetriesText(text);
    setRetriesText(text);

    // An invalid count keeps the last good one in the atom; the field shows the error.
    if (next !== null) {
      setOtLoop(
        mergeOtLoopFields(otLoop, {
          maxRetries: next,
          validationCommands: parseOtLoopCommandsText(validationText),
        }),
      );
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      className={className ?? 'border-0'}
      id="workflow-config-validation-legend"
      legend={heading}
    >
      <div className="space-y-4" data-testid="PlanWorkflowConfigValidation">
        <PlanRunOtLoopFields
          maxRetriesError={retriesError}
          maxRetriesText={retriesText}
          onMaxRetriesChange={handleRetriesChange}
          onValidationChange={handleValidationChange}
          validationText={validationText}
        />
      </div>
    </OpenThrottleFieldset>
  );
};
