/**
 * @description Plan-detail route body. Rendered inside {@link PlanRunConfigStoreProvider}
 * so it (and the tabs/toolbar below it) read the route-scoped run-config atoms directly.
 * The route module's default export is a thin Provider wrapper around this component —
 * a component cannot consume a Jotai Provider it renders in its own JSX, so the body
 * lives here. Extracted from `routes/plans.$planId._index.tsx`; behavior is unchanged.
 */
import * as React from 'react';
import { Card, TabsList, TabsTrigger } from '@openthrottle/react-router-shadcn';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import {
  BoltIcon,
  CogIcon,
  LayoutListIcon,
  TerminalSquareIcon,
} from 'lucide-react';
import { OpenThrottleTabs } from '@openthrottle/react-router-ui';
import {
  PLANS_DETAIL_TAB_SEARCH_PARAM,
  parsePlanDetailTab,
} from '~/routing/plans/utils/parsers';
import { PlanDetailRouteHeader } from '~/routing/plans/components/PlanDetailRouteHeader';
import { PlanTabConfiguration } from '~/routing/plans/components/PlanTabConfiguration';
import { PlanTabDetails } from '~/routing/plans/components/PlanTabDetails';
import { PlanTabTasks } from '~/routing/plans/components/PlanTabTasks';
import { PlanToolbar } from '~/routing/plans/components/PlanToolbar';
import { PlanTasksBoard } from '~/routing/plans/components/PlanTasksBoard';
import { PlanTabOutput } from '~/routing/plans/components/PlanTabOutput';
import { usePlanDetailRoute } from '~/routing/plans/hooks/usePlanDetailRoute';
import type { Route } from '@/app/routes/+types/plans.$planId._index';

export interface PlanDetailRouteProps {
  readonly loaderData: Route.ComponentProps['loaderData'];
  readonly params: Route.ComponentProps['params'];
  readonly plan: NonNullable<Route.ComponentProps['loaderData']['plan']>;
}

export const PlanDetailRoute = (
  props: PlanDetailRouteProps,
): React.ReactElement => {
  const { loaderData, params, plan } = props;
  const { tagVocabulary, tasks } = loaderData;

  // Hooks
  const {
    checkoutId,
    fullscreen,
    isBoardView,
    jobRunHooksJson,
    newestRunIsStale,
    onResetToDefaults,
    onSaveJobRunHooks,
    onSaveRunConfig,
    onToggleExpanded,
    planOutputChunks,
    ralphTuningJson,
    repositoryId,
    resolvedTaskCount,
    runConfigSaveBlocked,
    runConfigSaveBlockedReason,
    saveJobRunHooksDisabled,
    saveJobRunHooksPending,
    saveRunConfigPending,
    setFullscreen,
    status,
    tagFetcher,
    workflowRunBlocked,
    workflowRunBlockedReason,
    workingDirectory,
  } = usePlanDetailRoute({ loaderData, params, plan });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <>
      <GlobalScreen className="-max-w-5xl flex h-full w-full flex-col gap-4 p-4 md:gap-8 md:p-8 lg:gap-12 lg:p-12">
        <PlanDetailRouteHeader plan={plan} status={status} />

        <PlanToolbar
          checkoutId={checkoutId}
          className="bg-card border-card-border rounded-lg border p-4"
          jobRunHooksJson={jobRunHooksJson}
          newestRunIsStale={newestRunIsStale}
          onAddTag={(tag) =>
            tagFetcher.submit({ intent: 'addPlanTag', tag }, { method: 'post' })
          }
          onRemoveTag={(tag) =>
            tagFetcher.submit(
              { intent: 'removePlanTag', tag },
              { method: 'post' },
            )
          }
          planId={plan.id}
          planStatus={plan.status}
          planTitle={plan.title ?? 'Untitled'}
          ralphTuningJson={ralphTuningJson}
          repositoryId={repositoryId}
          tagVocabulary={tagVocabulary}
          tags={plan.tags}
          tagsPending={tagFetcher.state !== 'idle'}
          workflowRunBlocked={workflowRunBlocked}
          workflowRunBlockedReason={workflowRunBlockedReason}
          workingDirectory={workingDirectory}
        />

        <OpenThrottleTabs
          urlSync={{
            defaultValue: 'overview',
            param: PLANS_DETAIL_TAB_SEARCH_PARAM,
            parse: (raw) => parsePlanDetailTab(raw) ?? undefined,
          }}
        >
          <TabsList
            className="mb-8 w-full max-w-full justify-start gap-4 overflow-x-auto overflow-y-hidden"
            variant="line"
          >
            <TabsTrigger
              className="flex-0 cursor-pointer"
              id="plan-tab-overview"
              value="overview"
            >
              <BoltIcon />
              Details
            </TabsTrigger>
            <TabsTrigger
              className="flex-0 cursor-pointer"
              id="plan-tab-tasks"
              value="tasks"
            >
              <LayoutListIcon />
              Tasks ({resolvedTaskCount}/{tasks.length})
            </TabsTrigger>
            <TabsTrigger
              className="flex-0 cursor-pointer"
              id="plan-tab-output"
              value="output"
            >
              <TerminalSquareIcon />
              Output
            </TabsTrigger>

            <div className="flex-1" />
            <TabsTrigger
              className="flex-0 cursor-pointer"
              id="plan-tab-configuration"
              value="configuration"
            >
              <CogIcon />
              Configuration
            </TabsTrigger>
          </TabsList>

          <PlanTabDetails
            fullscreen={fullscreen}
            setFullscreen={setFullscreen}
          />
          <PlanTabTasks />
          <PlanTabOutput chunks={planOutputChunks} />
          <PlanTabConfiguration
            onCollapse={() => onToggleExpanded(false)}
            onResetToDefaults={onResetToDefaults}
            onSaveJobRunHooks={onSaveJobRunHooks}
            onSaveRunConfig={onSaveRunConfig}
            planProjectId={plan.projectId}
            repositories={loaderData.workspaceRepositories}
            saveJobRunHooksDisabled={saveJobRunHooksDisabled}
            saveJobRunHooksPending={saveJobRunHooksPending}
            saveRunConfigDisabled={runConfigSaveBlocked}
            saveRunConfigPending={saveRunConfigPending}
          />

          {/* saveJobRunHooks / saveRunConfig outcomes surface as toasts
                (useActionToast in usePlanRunConfigEditor). */}

          {runConfigSaveBlocked && runConfigSaveBlockedReason != null ? (
            <p className="text-muted-foreground px-4 text-xs" role="note">
              Save configuration blocked: {runConfigSaveBlockedReason}
            </p>
          ) : null}
        </OpenThrottleTabs>
      </GlobalScreen>

      {isBoardView ? (
        <Card className="mx-4 overflow-hidden">
          <PlanTasksBoard />
        </Card>
      ) : null}
    </>
  );
};
