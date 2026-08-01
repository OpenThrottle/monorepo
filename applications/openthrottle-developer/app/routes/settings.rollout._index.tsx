import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import {
  CreateRolloutFlagDocument,
  DeleteRolloutFlagDocument,
  ListRolloutFlagsDocument,
} from '~/__generated__/graphql';
import { RolloutFlagCreateDialog } from '~/routing/settings/components/RolloutFlagCreateDialog';
import { RolloutFlagsTable } from '~/routing/settings/components/RolloutFlagsTable';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import {
  optionalRolloutString,
  parseRolloutEnabled,
  parseRolloutTargetRoles,
} from '~/routing/settings/utils/rollout-action';
import type { Route } from '@/app/routes/+types/settings.rollout._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => ROLLOUT_COPY.title,
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const data = await executeGraphqlWithAuth(
    args.request,
    ListRolloutFlagsDocument,
  );

  return { flags: data.rolloutFlags };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Rollout | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData } = props;
  const { flags } = loaderData;
  const actionError =
    actionData && 'error' in actionData ? actionData.error : null;

  return (
    <GlobalScreen>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">{ROLLOUT_COPY.title}</h1>
          <p className="text-muted-foreground text-sm">{ROLLOUT_COPY.intro}</p>
        </div>
        <RolloutFlagCreateDialog actionError={actionError} />
      </div>

      <RolloutFlagsTable flags={flags} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'createRolloutFlag') {
    const key = optionalRolloutString(formData.get('key'));
    if (!key) {
      return { error: 'A flag key is required.' };
    }

    try {
      await executeGraphqlWithAuth(args.request, CreateRolloutFlagDocument, {
        input: {
          description: optionalRolloutString(formData.get('description')),
          enabled: parseRolloutEnabled(formData.get('enabled')),
          key,
          targetRoles: parseRolloutTargetRoles(formData.get('targetRoles')),
        },
      });
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create flag.';
      return { error: message };
    }
  }

  if (intent === 'deleteRolloutFlag') {
    const id = formData.get('id');
    if (typeof id !== 'string' || !id.trim()) {
      return { error: 'Missing flag id.' };
    }

    try {
      await executeGraphqlWithAuth(args.request, DeleteRolloutFlagDocument, {
        id: id.trim(),
      });
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete flag.';
      return { error: message };
    }
  }

  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
