import * as React from 'react';
import classnames from 'classnames';
import { useAtomValue } from 'jotai';
import { Label } from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { workflowRalphCanonicalCommandLineAtom } from '~/routing/plans/data/atom.plan';

interface PlanWorkflowCommandProps {
  readonly className?: string;

  /**
   * @description When set (controlled workflow config), the preview and clipboard use this
   * string; otherwise {@link workflowRalphCanonicalCommandLineAtom} supplies the line.
   */
  readonly canonicalCommandLineOverride?: string;
}

export const PlanWorkflowCommand = (props: PlanWorkflowCommandProps) => {
  const { canonicalCommandLineOverride, className } = props;

  // Hooks
  const atomCanonicalCommandLine = useAtomValue(
    workflowRalphCanonicalCommandLineAtom,
  );

  // Setup
  const canonicalCommandLine =
    canonicalCommandLineOverride ?? atomCanonicalCommandLine;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('space-y-2', className)}
      data-testid="PlanWorkflowCommand"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Label htmlFor="workflow-run-preview">Canonical CLI (preview)</Label>
        <OpenThrottleClipboard
          className="text-primary hover:text-primary/90 text-sm font-medium underline underline-offset-4"
          label="Copy canonical command"
          text={canonicalCommandLine}
        />
      </div>
      <pre
        className="bg-muted max-h-40 overflow-x-auto overflow-y-auto rounded-md p-3 text-xs leading-relaxed"
        data-testid="workflow-run-cli-preview"
        id="workflow-run-preview"
      >
        {canonicalCommandLine}
      </pre>
      <p className="text-muted-foreground text-xs" role="note">
        <span className="font-medium text-foreground">Toolbar queue:</span> Run
        / Add to Queue uses the tuning fields in this section (or defaults if
        you have not changed them). The worker always runs this plan;{' '}
        <code className="mx-0.5 text-[0.7rem]">--task</code> in the preview is
        for local CLI only. Copy the command above to match a manual run.
      </p>
    </div>
  );
};
