import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@openthrottle/react-router-shadcn';
import type { JobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';
import {
  createDefaultJobRunHookDraftRow,
  validateJobRunHooksDraftRows,
} from '~/routing/plans/utils/job-run-hooks-ui';
import { PlanWorkflowConfigHookRow } from '~/routing/plans/components/PlanWorkflowConfigHookRow';
import { PlanWorkflowConfigHooksValidation } from '~/routing/plans/components/PlanWorkflowConfigHooksValidation';
import { PlanWorkflowConfigHooksEmpty } from '~/routing/plans/components/PlanWorkflowConfigHooksEmpty';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';

export interface PlanWorkflowConfigHooksProps {
  heading: string;
  hooks: readonly JobRunHookDraftRow[];
  onChange: (next: JobRunHookDraftRow[]) => void;
  /**
   * @description When set, shows Save to plan (persists via parent fetcher).
   */
  onSave: () => void;
  saveDisabled?: boolean;
  savePending?: boolean;
}

export const PlanWorkflowConfigHooks = (
  props: PlanWorkflowConfigHooksProps,
): React.ReactElement => {
  const {
    heading,
    hooks,
    onChange,
    onSave,
    saveDisabled = false,
    savePending = false,
  } = props;

  const validation = validateJobRunHooksDraftRows(hooks);

  const handleAdd = (): void => {
    onChange([...hooks, createDefaultJobRunHookDraftRow()]);
  };

  return (
    <>
      <OpenThrottleFieldset
        className="border-0"
        id="job-run-hooks-legend"
        legend={heading}
      >
        <div className="mb-4 flex flex-row flex-wrap items-center justify-between gap-4 pb-2">
          <p className="text-muted-foreground text-xs font-normal">
            Run a prompt profile or repo skill before or after the main Ralph
            job (server-side; not CLI flags). Saved on the plan and sent on
            enqueue.
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              data-testid="job-run-hooks-add"
              onClick={handleAdd}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus />
              Add hook
            </Button>
            <Button
              data-testid="job-run-hooks-save"
              disabled={saveDisabled || !validation.ok || savePending}
              onClick={onSave}
              size="sm"
              type="button"
            >
              {savePending ? 'Saving…' : 'Save to plan'}
            </Button>
          </div>
        </div>
      </OpenThrottleFieldset>

      <fieldset
        className="ml-4 space-y-4"
        data-testid="PlanWorkflowConfigHooks"
      >
        <PlanWorkflowConfigHooksValidation validation={validation} />
        {hooks.length === 0 ? (
          <PlanWorkflowConfigHooksEmpty />
        ) : (
          <ul className="space-y-4">
            {hooks.map((row, index) => (
              <PlanWorkflowConfigHookRow
                hooks={hooks}
                index={index}
                key={row.draftId}
                onChange={onChange}
                row={row}
              />
            ))}
          </ul>
        )}
      </fieldset>
    </>
  );
};
