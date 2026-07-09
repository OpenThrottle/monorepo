import * as React from 'react';
import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { workflowRalphCanonicalCommandLineAtom } from '~/routing/plans/data/atom.plan';
import { Button } from '@openthrottle/react-router-shadcn';
import { RefreshCcwIcon } from 'lucide-react';

export interface PlanWorkflowCommandProps {
  className?: string;

  /**
   * @description When set (controlled workflow config), the preview and clipboard use this
   * string; otherwise {@link workflowRalphCanonicalCommandLineAtom} supplies the line.
   */
  command?: string;
  onReset?: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  savePending?: boolean;
}

export const PlanWorkflowCommand = (
  props: PlanWorkflowCommandProps,
): React.ReactElement => {
  const {
    className,
    command,
    onReset,
    onSave,
    saveDisabled = false,
    savePending = false,
  } = props;

  // Hooks
  const atomCommand = useAtomValue(workflowRalphCanonicalCommandLineAtom);

  // Setup
  const canonicalCommandLine = command ?? atomCommand;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('space-y-2', className)}
      data-testid="PlanWorkflowCommand"
    >
      <h2>Canonical CLI (preview)</h2>
      <div className="flex w-full items-center gap-2">
        <pre
          className="bg-background flex-1 overflow-x-auto overflow-y-auto rounded-md border px-4 py-2 leading-none"
          data-testid="workflow-run-cli-preview"
          id="workflow-run-preview"
        >
          <OpenThrottleClipboard
            className="text-primary hover:text-primary/90 text-xs"
            label={canonicalCommandLine}
            text={canonicalCommandLine}
          />
        </pre>
        <Button
          aria-label="Reset workflow run options to defaults"
          data-testid="workflow-run-options-reset"
          disabled={onReset == null}
          onClick={onReset}
          // size="lg"
          variant="outline"
        >
          {/* Reset to defaults */}
          <RefreshCcwIcon />
        </Button>
        {onSave != null ? (
          <Button
            data-testid="plan-run-config-save"
            disabled={saveDisabled || savePending}
            onClick={onSave}
            type="button"
          >
            {savePending ? 'Saving…' : 'Save to plan'}
          </Button>
        ) : null}
      </div>

      <p className="text-muted-foreground mt-4 text-xs" role="note">
        <span className="text-foreground font-medium">Toolbar queue:</span> Run
        / Add to Queue uses the tuning fields in this section (or defaults if
        you have not changed them). The worker always runs this plan;{' '}
        <code className="mx-0.5 text-[0.7rem]">--task</code> in the preview is
        for local CLI only. Copy the command above to match a manual run.
      </p>
    </div>
  );
};
