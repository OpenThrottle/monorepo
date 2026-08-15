import * as React from 'react';
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
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { CreateRolloutFlagInputSchema } from '~/__generated__/schemas';
import {
  CreateRolloutFlagDocument,
  DeleteRolloutFlagDocument,
  ListRolloutFlagsDocument,
} from '~/__generated__/graphql';
import { RolloutFlagCreateDialog } from '~/routing/settings/components/RolloutFlagCreateDialog';
import { RolloutFlagsTable } from '~/routing/settings/components/RolloutFlagsTable';
import { RolloutSdkHydrationStatus } from '~/routing/settings/components/RolloutSdkHydrationStatus';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { parseRolloutTargetRoles } from '~/routing/settings/utils/rollout-action';
import {
  parseRolloutTypedConfig,
  toRolloutGraphqlTypedInput,
} from '~/routing/settings/utils/rollout-typed-config';
import type { Route } from '@/app/routes/+types/settings.rollout._index';
import { ToggleRightIcon } from 'lucide-react';

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

  // Hooks

  // Setup
  const actionError = getActionError(actionData) ?? null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="flex flex-col gap-4">
        <GlobalHeading
          heading="h1"
          icon={ToggleRightIcon}
          title={ROLLOUT_COPY.title}
        />
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground text-sm">
            {ROLLOUT_COPY.createDescription}
          </p>
          <RolloutFlagCreateDialog actionError={actionError} />
        </div>
        <RolloutSdkHydrationStatus />
      </div>

      <RolloutFlagsTable flags={flags} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'createRolloutFlag') {
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
      await executeGraphqlWithAuth(args.request, CreateRolloutFlagDocument, {
        input: {
          description: parsed.data.description ?? null,
          enabled: parsed.data.enabled,
          key: parsed.data.key,
          targetRoles: parseRolloutTargetRoles(formData.get('targetRoles')),
          ...toRolloutGraphqlTypedInput(typed.config),
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
    const parsed = parseFormData(
      formData,
      z.object({ id: z.string().min(1) }),
      { strict: false },
    );
    if (!parsed.success) {
      return { error: 'Missing flag id.' };
    }

    try {
      await executeGraphqlWithAuth(args.request, DeleteRolloutFlagDocument, {
        id: parsed.data.id,
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
