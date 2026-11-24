import { Button, cn } from '@openthrottle/react-router-shadcn';
import { RefreshCcwIcon } from 'lucide-react';
import * as React from 'react';

import { PLAN_WORKFLOW_CONFIG_ACTIONS_COPY } from '~/routing/plans/data/data.copy';

export interface PlanWorkflowConfigActionsProps {
  className?: string;
  onReset?: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  savePending?: boolean;
}

/**
 * @description The Configuration tab's header bar: the section title with the Reset-to-defaults
 * and Save-to-plan buttons, and a note on what the toolbar's Run / Queue buttons use.
 */
export const PlanWorkflowConfigActions = (
  props: PlanWorkflowConfigActionsProps,
): React.ReactElement => {
  const {
    className,
    onReset,
    onSave,
    saveDisabled = false,
    savePending = false,
  } = props;

  // Hooks

  // Setup
  const copy = PLAN_WORKFLOW_CONFIG_ACTIONS_COPY;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('space-y-2', className)}
      data-testid="PlanWorkflowConfigActions"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <h2>{copy.heading}</h2>
        <div className="flex items-center gap-2">
          <Button
            aria-label={copy.resetLabel}
            data-testid="workflow-run-options-reset"
            disabled={onReset == null}
            onClick={onReset}
            variant="outline"
          >
            <RefreshCcwIcon />
          </Button>
          {onSave != null && (
            <Button
              data-testid="plan-run-config-save"
              disabled={saveDisabled || savePending}
              onClick={onSave}
              type="button"
            >
              {savePending ? copy.savePendingLabel : copy.saveLabel}
            </Button>
          )}
        </div>
      </div>

      <p className="text-muted-foreground mt-4 text-xs" role="note">
        <span className="text-foreground font-medium">{copy.noteLabel}</span>{' '}
        {copy.note}
      </p>
    </div>
  );
};
