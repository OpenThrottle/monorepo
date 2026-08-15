import * as React from 'react';
import { redirect } from 'react-router';
import {
  coerceBoolean,
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';
import {
  getActionError,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { CreateRolloutFlagInputSchema } from '~/__generated__/schemas';
import {
  DeleteRolloutFlagDocument,
  GetRolloutFlagDocument,
  UpdateRolloutFlagDocument,
} from '~/__generated__/graphql';
import { RolloutFlagEditForm } from '~/routing/settings/components/RolloutFlagEditForm';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import {
  parseRolloutTargetRoles,
  rolloutFlagDetailPath,
} from '~/routing/settings/utils/rollout-action';
import {
  parseRolloutTypedConfig,
  toRolloutGraphqlTypedInput,
} from '~/routing/settings/utils/rollout-typed-config';
import type { Route } from '@/app/routes/+types/settings.rollout.$flagId.edit';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Edit',
  links: (match) => [
    { children: 'Settings', to: '/settings' },
    { children: ROLLOUT_COPY.title, to: '/settings/rollout' },
    {
      children: match.loaderData?.flag.key ?? 'Flag',
      to: rolloutFlagDetailPath(match.loaderData?.flag.id ?? ''),
    },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const data = await executeGraphqlWithAuth(
    args.request,
    GetRolloutFlagDocument,
    { id: args.params.flagId },
  );

  if (!data.rolloutFlag) {
    throw new Response('Feature flag not found', { status: 404 });
  }

  return { flag: data.rolloutFlag };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const key = args.loaderData?.flag.key ?? 'Flag';
  return [{ title: `Edit ${key} | Rollout | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  const { actionData, loaderData, params } = props;
  const { flag } = loaderData;
  const actionError = getActionError(actionData) ?? null;

  return (
    <GlobalScreen>
      <RolloutFlagEditForm
        actionError={actionError}
        cancelTo={rolloutFlagDetailPath(params.flagId)}
        flag={flag}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'updateRolloutFlag') {
    const parsed = parseFormData(
      formData,
      CreateRolloutFlagInputSchema()
        .pick({ description: true, key: true })
        .extend({ enabled: coerceBoolean(z.boolean().default(false)) }),
      { strict: false },
    );
    if (!parsed.success) {
      return { error: 'A flag key is required.' };
    }

    const typed = parseRolloutTypedConfig(formData);
    if (!typed.ok) {
      return { error: typed.error };
    }

    try {
      await executeGraphqlWithAuth(args.request, UpdateRolloutFlagDocument, {
        input: {
          description: parsed.data.description ?? null,
          enabled: parsed.data.enabled,
          id: args.params.flagId,
          key: parsed.data.key,
          targetRoles: parseRolloutTargetRoles(formData.get('targetRoles')),
          ...toRolloutGraphqlTypedInput(typed.config),
        },
      });
      return redirect(rolloutFlagDetailPath(args.params.flagId));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update flag.';
      return { error: message };
    }
  }

  if (intent === 'deleteRolloutFlag') {
    try {
      await executeGraphqlWithAuth(args.request, DeleteRolloutFlagDocument, {
        id: args.params.flagId,
      });
      return redirect('/settings/rollout');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete flag.';
      return { error: message };
    }
  }

  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
