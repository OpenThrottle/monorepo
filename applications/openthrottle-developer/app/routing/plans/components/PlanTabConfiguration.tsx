import * as React from 'react';
import { useAtom } from 'jotai';
import { Card, TabsContent } from '@openthrottle/react-router-shadcn';
import { DEFAULT_RALPH_PROMPT } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { PlanTabConfigurationValidation } from '~/routing/plans/components/PlanTabConfigurationValidation';
import { PlanWorkflowCommand } from '~/routing/plans/components/PlanWorkflowCommand';
import { PlanWorkflowConfigExecution } from '~/routing/plans/components/PlanWorkflowConfigExecution';
import { PlanWorkflowConfigPrompt } from '~/routing/plans/components/PlanWorkflowConfigPrompt';
import { PlanWorkflowConfigTarget } from '~/routing/plans/components/PlanWorkflowConfigTarget';
import { PlanWorkflowConfigHooks } from '~/routing/plans/components/PlanWorkflowConfigHooks';
import { PlanWorkflowConfigTuning } from '~/routing/plans/components/PlanWorkflowConfigTuning';
import { PlanWorkflowConfigWorktree } from '~/routing/plans/components/PlanWorkflowConfigWorktree';
import { PlanWorkflowConfigWorkspaceSelector } from '~/routing/plans/components/PlanWorkflowConfigWorkspaceSelector';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import {
  jobRunHookDraftRowsAtom,
  workflowCheckoutIdAtom,
  workflowRalphRunOptionsAtom,
  workflowRepositoryIdAtom,
  workflowRunIterationTimeoutTextAtom,
  workflowWorkingDirectoryAtom,
} from '~/routing/plans/data/atom.plan';

/**
 * @description Workflow-ralph CLI options (`--plan` / `--task` and tuning flags)
 * with canonical preview/copy. Reads and writes the route-scoped run-config atoms
 * directly (seeded by {@link PlanRunConfigStoreProvider}); the same values are
 * serialized for `enqueuePlanRun` (tuning only; queue is always plan-scoped) and for
 * saving to the plan.
 */
export interface PlanTabConfigurationProps {
  className?: string;

  /**
   * @description When set (plan detail URL-driven panel), shows a control to collapse the section.
   */
  onCollapse?: () => void;

  /**
   * @description When set (e.g. plan detail), shows a control to restore tuning fields and iteration timeout to defaults for this plan/task context.
   */
  onResetToDefaults?: () => void;

  onSaveJobRunHooks: () => void;

  onSaveRunConfig?: () => void;

  /** @description The plan's linked project id; pre-fills the workspace repository. */
  planProjectId?: string | null;

  /**
   * @description Registered repositories (with the user's checkouts) for the
   * workspace run-config selector. Defaults to empty (monorepo-root / custom-path only).
   */
  repositories?: readonly PlanRunConfigRepositoryFieldsFragment[];

  saveJobRunHooksDisabled?: boolean;
  saveJobRunHooksPending?: boolean;
  saveRunConfigDisabled?: boolean;
  saveRunConfigPending?: boolean;
}

export const PlanTabConfiguration = (
  props: PlanTabConfigurationProps,
): React.ReactElement => {
  const {
    onCollapse: _onCollapse, // FIXME: Trim this bad boy
    onResetToDefaults,
    onSaveJobRunHooks,
    onSaveRunConfig,
    planProjectId,
    repositories = [],
    saveJobRunHooksDisabled,
    saveJobRunHooksPending,
    saveRunConfigDisabled,
    saveRunConfigPending,
  } = props;

  // Hooks
  const [input, setInput] = useAtom(workflowRalphRunOptionsAtom);
  const [iterationTimeoutText, setIterationTimeoutText] = useAtom(
    workflowRunIterationTimeoutTextAtom,
  );
  const [workingDirectory, setWorkingDirectory] = useAtom(
    workflowWorkingDirectoryAtom,
  );
  const [checkoutId, setCheckoutId] = useAtom(workflowCheckoutIdAtom);
  const [repositoryId, setRepositoryId] = useAtom(workflowRepositoryIdAtom);
  const [jobRunHookRows, setJobRunHookRows] = useAtom(jobRunHookDraftRowsAtom);

  // Setup

  // Handlers
  // (Run target: PlanWorkflowConfigTarget)

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent value="configuration">
      <div className="flex flex-col gap-4 md:gap-8">
        <Card className="p-4">
          <PlanWorkflowCommand
            onReset={onResetToDefaults}
            onSave={onSaveRunConfig}
            saveDisabled={saveRunConfigDisabled}
            savePending={saveRunConfigPending}
          />
        </Card>

        <PlanTabConfigurationValidation />

        <PlanWorkflowConfigTarget
          heading="01. Target"
          input={input}
          setInput={setInput}
        />

        <PlanWorkflowConfigWorkspaceSelector
          checkoutId={checkoutId}
          heading="02. Workspace"
          onCheckoutIdChange={setCheckoutId}
          onRepositoryIdChange={setRepositoryId}
          onWorkingDirectoryChange={setWorkingDirectory}
          planProjectId={planProjectId}
          repositories={repositories}
          repositoryId={repositoryId}
          workingDirectory={workingDirectory}
        />

        <PlanWorkflowConfigHooks
          heading="03. Lifecycle"
          hooks={jobRunHookRows}
          onChange={setJobRunHookRows}
          onSave={onSaveJobRunHooks}
          saveDisabled={saveJobRunHooksDisabled}
          savePending={saveJobRunHooksPending}
        />

        <PlanWorkflowConfigPrompt
          heading="04. Prompt"
          onPromptChange={(next) =>
            setInput((prev) => ({ ...prev, prompt: next }))
          }
          onPromptFileChange={(next) =>
            setInput((prev) => ({ ...prev, promptFile: next }))
          }
          onPromptLayerChange={(next) => {
            setInput((prev) => {
              if (next === 'named') {
                return { ...prev, promptFile: '', promptLayer: 'named' };
              }

              return {
                ...prev,
                prompt: DEFAULT_RALPH_PROMPT,
                promptLayer: 'file',
              };
            });
          }}
          prompt={input.prompt}
          promptFile={input.promptFile}
          promptLayer={input.promptLayer}
        />

        <PlanWorkflowConfigExecution
          heading="05. Agent"
          input={input}
          setInput={setInput}
        />
        <PlanWorkflowConfigWorktree
          heading="06. Worktree"
          input={input}
          setInput={setInput}
        />
        <PlanWorkflowConfigTuning
          heading="07. Run Tuning"
          input={input}
          iterationTimeoutText={iterationTimeoutText}
          setInput={setInput}
          setIterationTimeoutText={setIterationTimeoutText}
        />
      </div>
    </TabsContent>
  );
};
