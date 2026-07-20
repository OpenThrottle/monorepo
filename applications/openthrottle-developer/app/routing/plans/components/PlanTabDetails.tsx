import * as React from 'react';
import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { EditorWindow } from '@openthrottle/react-router-editor';
import { TabsContent } from '@openthrottle/react-router-shadcn';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';
import { PlanLifecycleHooksSection } from '~/routing/plans/components/PlanLifecycleHooksSection';
import { PLAN_LIFECYCLE_HOOKS_COPY } from '~/routing/plans/data/data.copy';
import { PlanWorkflowRunTransparency } from '~/routing/plans/components/PlanWorkflowRunTransparency';
import {
  buildWorkflowRalphOptionArgs,
  formatWorkflowRalphCommandLine,
  parseWorkflowRunIterationTimeoutSeconds,
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  workflowRalphRunOptionsAtom,
  workflowRunIterationTimeoutTextAtom,
  workflowWorkingDirectoryAtom,
} from '~/routing/plans/data/atom.plan';

export interface PlanTabDetailsProps {
  fullscreen: boolean;
  setFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PlanTabDetails = (
  props: PlanTabDetailsProps,
): React.ReactElement | null => {
  const {
    fullscreen,
    // setFullscreen,
  } = props;

  // Hooks
  const { plan, planRunAuditRows, recentPlanRuns, tasks } =
    usePlanDetailRouteData();
  const workflowInput = useAtomValue(workflowRalphRunOptionsAtom);
  const workflowTimeout = useAtomValue(workflowRunIterationTimeoutTextAtom);
  const workingDirectory = useAtomValue(workflowWorkingDirectoryAtom);

  // Setup
  const canonicalWorkflowCommand = React.useMemo(() => {
    const merged: WorkflowRalphRunOptionsInput = {
      ...workflowInput,
      iterationTimeoutSeconds:
        parseWorkflowRunIterationTimeoutSeconds(workflowTimeout),
    };

    return formatWorkflowRalphCommandLine(buildWorkflowRalphOptionArgs(merged));
  }, [workflowInput, workflowTimeout]);

  const hasSummary = plan?.summary != null && plan.summary !== '';
  const requirements = React.useMemo(() => {
    return tasks
      .map((task) => JSON.parse(task.requirementsJson))
      .filter((requirement) => requirement.length > 0);
  }, [tasks]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (plan == null) {
    return null;
  }

  return (
    <TabsContent value="overview">
      <div className="flex flex-col gap-4 md:gap-8">
        <div className="bg-card border-card-border rounded-lg border p-4 md:p-8">
          <PlanLifecycleHooksSection
            afterHooks={plan.afterHooks}
            beforeHooks={plan.beforeHooks}
            heading={PLAN_LIFECYCLE_HOOKS_COPY.planSectionTitle}
            planId={plan.id}
          />
        </div>

        <div
          className={clsx('bg-card', {
            'absolute inset-0 z-50 h-full w-full': fullscreen,
            'border-transparent hover:border-transparent': fullscreen,
            relative: !fullscreen,
          })}
        >
          {fullscreen ? (
            <EditorWindow
              className="flex-1 transition-all duration-300"
              height={fullscreen ? '100vh' : '300px'}
              language="markdown"
              options={{
                minimap: { enabled: false },
              }}
              value={plan.description ?? ''}
              width="100%"
              wrapperProps={{ className: 'transition-all duration-300' }}
              // onChange={handleEditorChange}
            />
          ) : (
            <div className="bg-card border-card-border space-y-4 rounded-lg border p-4 md:p-8">
              {hasSummary && (
                <div>
                  <h2 className="mb-4">Summary</h2>
                  <MarkdownRenderer source={plan.summary ?? ''} />
                </div>
              )}

              <MarkdownRenderer source={plan.description ?? ''} />
              {requirements.length > 0 ? (
                <>
                  <h2 className="mb-4">Requirements</h2>
                  <MarkdownRenderer
                    source={requirements
                      .map((requirement) => `- ${requirement}`)
                      .join('\n')}
                  />
                </>
              ) : (
                <OpenThrottleEmptyState
                  className="p-0!"
                  description="This plan and its tasks have no requirements. Modify the plan and its tasks to add requirements."
                  title="No Requirements"
                />
              )}
            </div>
          )}
        </div>

        <PlanWorkflowRunTransparency
          canonicalWorkflowCommand={canonicalWorkflowCommand}
          planId={plan.id}
          planRunAuditRows={planRunAuditRows}
          recentPlanRuns={recentPlanRuns}
          workflowInput={workflowInput}
          workflowTimeout={workflowTimeout}
          workingDirectory={workingDirectory ?? ''}
        />
      </div>
    </TabsContent>
  );
};
