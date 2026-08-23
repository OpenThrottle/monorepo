import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { Blockquote } from '@openthrottle/react-router-shadcn';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { FolderIcon } from 'lucide-react';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { redirect } from 'react-router';
import {
  CreatePlanDocument,
  GetWorkspaceSettingsDocument,
} from '~/__generated__/graphql';
import { PlanCreateEditorLinks } from '~/routing/plans/components/PlanCreateEditorLinks';
import {
  readPlanFormValues,
  resolvePlanFormErrorField,
} from '~/routing/plans/utils/plan-form-values';
import { SITE_TITLE } from '~/global/config/settings';
import type { PlanCreateEditorLinksRepository } from '~/routing/plans/components/PlanCreateEditorLinks';
import type { PlanFormActionData } from '~/routing/plans/data/plan-form-action-data';
import type { Route } from '@/app/routes/+types/plans.create';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create',
  links: (_match) => [{ children: 'Plans', to: '/plans' }],
};

interface PlanCreateLoaderData {
  /** Editors the user enabled in workspace settings. */
  editors: readonly WorkspaceEditorId[];
  /** The user's registered local checkouts, for editor deep-links. */
  repositories: readonly PlanCreateEditorLinksRepository[];
}

export const loader = async (
  args: Route.LoaderArgs,
): Promise<PlanCreateLoaderData> => {
  // Editor deep-links are a convenience, so a workspace-settings failure degrades
  // to no links rather than taking the create form down with it.
  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      GetWorkspaceSettingsDocument,
    );

    return {
      editors: data.workspaceSettings.profile.enabledEditors,
      repositories: data.workspaceSettings.localRepositories.map(
        (repository) => ({
          displayName: repository.displayName,
          filesystemPath: repository.filesystemPath,
          id: repository.id,
        }),
      ),
    };
  } catch {
    return { editors: [], repositories: [] };
  }
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Create plan | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { editors, repositories } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={FolderIcon}
          title="Create a new plan"
        />
        <p className="text-muted-foreground text-sm">
          A "form" simply doesn&apos;t cut it for creating plans and tasks. Use
          the OpenThrottle MCP from wherever you&apos;re most comfortable.
        </p>

        <Blockquote className="border-yellow-500 text-yellow-500">
          <p className="py-4">
            This page will be removed in in the near future.
          </p>
        </Blockquote>
      </div>

      <PlanCreateEditorLinks editors={editors} repositories={repositories} />

      {/*
      <PlanCreateMcpParityShell>
        <PlanForm actionData={actionData} />
      </PlanCreateMcpParityShell>
      */}
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  // 🚨 Every failed return below echoes `values` back so the form re-renders
  // with what the user typed instead of clearing itself.
  const values = readPlanFormValues(formData);

  if (!values.category?.trim()) {
    return {
      error: 'Category is required.',
      field: 'category',
      values,
    } satisfies PlanFormActionData;
  }

  if (!values.title?.trim()) {
    return {
      error: 'Title is required.',
      field: 'title',
      values,
    } satisfies PlanFormActionData;
  }

  const input = {
    author: values.author?.trim() ?? '',
    category: values.category.trim(),
    title: values.title.trim(),
    ...(values.assignee?.trim() && { assignee: values.assignee.trim() }),
    ...(values.description?.trim() && {
      description: values.description.trim(),
    }),
    ...(values.project?.trim() && { project: values.project.trim() }),
    ...(values.projectId?.trim() && { projectId: values.projectId.trim() }),
    ...(values.status?.trim() && { status: values.status.trim() }),
    ...(values.summary?.trim() && { summary: values.summary.trim() }),
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      CreatePlanDocument,
      { input },
    );

    if (!result.createPlan?.id) {
      return {
        error: 'Failed to create plan.',
        values,
      } satisfies PlanFormActionData;
    }

    return redirect(`/plans/${result.createPlan.id}`);
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Failed to create plan.';

    return {
      error: message,
      field: resolvePlanFormErrorField(message),
      values,
    } satisfies PlanFormActionData;
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
