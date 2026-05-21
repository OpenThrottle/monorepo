import * as React from 'react';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@openthrottle/react-router-shadcn';
import {
  WORKFLOW_RALPH_ENV_VARS,
  type WorkflowRalphRunOptionsInput,
  type WorkflowRalphWorktreeCli,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanWorkflowConfigWorktreeProps {
  input: WorkflowRalphRunOptionsInput;
  setInput: (
    updater: React.SetStateAction<WorkflowRalphRunOptionsInput>,
  ) => void;
}

export const PlanWorkflowConfigWorktree = (
  props: PlanWorkflowConfigWorktreeProps,
) => {
  const { input, setInput } = props;

  // Hooks

  // Setup
  const isCursor = input.executionBackend === 'cursor';

  // Handlers
  const handleWorktreeCliChange = (value: WorkflowRalphWorktreeCli): void => {
    setInput((prev) => {
      if (value === 'named') {
        return { ...prev, worktreeCli: value };
      }

      if (value === 'flag-only') {
        return {
          ...prev,
          worktreeCli: value,
          worktreeName: '',
        };
      }

      return {
        ...prev,
        worktreeCli: value,
        worktreeName: '',
      };
    });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="mt-8">
      <h2 className="pb-2 mb-4">Layer X - Agent CLI worktree</h2>
      <div>
        <fieldset
          aria-labelledby="workflow-run-worktree-legend"
          className="space-y-4"
          data-testid="PlanWorkflowConfigWorktree"
        >
          <legend className="sr-only" id="workflow-run-worktree-legend">
            Agent CLI worktree
          </legend>
          <p className="text-muted-foreground text-xs">
            Forwards <code className="text-xs">--worktree</code> to cursor-agent
            and claude per iteration. Physical BullMQ git worktrees (
            <code className="text-xs">WORKTREE_TARGETS</code>) are unchanged;
            when omitted on enqueue, nested runs default the agent name to the
            acquired target id.
          </p>
          <div className="space-y-2">
            <Label htmlFor="workflow-run-worktree-cli">--worktree</Label>
            <Select
              onValueChange={(v) => {
                if (v === 'omit' || v === 'flag-only' || v === 'named') {
                  handleWorktreeCliChange(v);
                }
              }}
              value={input.worktreeCli}
            >
              <SelectTrigger
                aria-describedby="workflow-run-worktree-cli-hint"
                className="max-w-md"
                id="workflow-run-worktree-cli"
              >
                <SelectValue placeholder="Agent worktree mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="omit">
                  Omit (queue may use acquired target id)
                </SelectItem>
                <SelectItem value="named">
                  Named (--worktree with name)
                </SelectItem>
                <SelectItem value="flag-only">
                  Flag only (--worktree, CLI preview only)
                </SelectItem>
              </SelectContent>
            </Select>
            <p
              className="text-muted-foreground text-xs"
              id="workflow-run-worktree-cli-hint"
            >
              Env:{' '}
              <code className="text-xs">
                {WORKFLOW_RALPH_ENV_VARS.worktree}
              </code>
              . Flag-only is not sent on enqueue (GraphQL requires a name); use
              local CLI or env for that mode.
            </p>
          </div>
          {input.worktreeCli === 'named' ? (
            <div className="space-y-2">
              <Label htmlFor="workflow-run-worktree-name">Worktree name</Label>
              <Input
                aria-describedby="workflow-run-worktree-name-hint"
                aria-label="Agent CLI worktree name for --worktree"
                autoComplete="off"
                id="workflow-run-worktree-name"
                onChange={(e) =>
                  setInput((prev) => ({
                    ...prev,
                    worktreeName: e.target.value,
                  }))
                }
                placeholder="e.g. target-one"
                spellCheck={false}
                value={input.worktreeName}
              />
              <p
                className="text-muted-foreground text-xs"
                id="workflow-run-worktree-name-hint"
              >
                Passed to nested <code className="text-xs">workflow-ralph</code>{' '}
                and each iteration runner.
              </p>
            </div>
          ) : null}
          {isCursor ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workflow-run-worktree-base">
                  --worktree-base
                </Label>
                <Input
                  aria-describedby="workflow-run-worktree-base-hint"
                  aria-label="Base branch for cursor-agent --worktree-base"
                  autoComplete="off"
                  id="workflow-run-worktree-base"
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      worktreeBase: e.target.value,
                    }))
                  }
                  placeholder="e.g. main"
                  spellCheck={false}
                  value={input.worktreeBase}
                />
                <p
                  className="text-muted-foreground text-xs"
                  id="workflow-run-worktree-base-hint"
                >
                  Cursor-only. Env:{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.worktreeBase}
                  </code>
                  ; empty omits the flag.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    aria-label="Enable --skip-worktree-setup for cursor-agent"
                    checked={input.skipWorktreeSetup}
                    id="workflow-run-skip-worktree-setup"
                    onCheckedChange={(checked) =>
                      setInput((prev) => ({
                        ...prev,
                        skipWorktreeSetup: checked === true,
                      }))
                    }
                  />
                  <Label htmlFor="workflow-run-skip-worktree-setup">
                    --skip-worktree-setup
                  </Label>
                </div>
                <p className="text-muted-foreground text-xs">
                  Skip <code className="text-xs">.cursor/worktrees.json</code>{' '}
                  setup scripts. Env:{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.skipWorktreeSetup}
                  </code>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              <code className="text-xs">--worktree-base</code> and{' '}
              <code className="text-xs">--skip-worktree-setup</code> apply only
              when the execution backend is Cursor.
            </p>
          )}
        </fieldset>
      </div>
    </div>
  );
};
