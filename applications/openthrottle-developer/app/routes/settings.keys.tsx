import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { useSearchParams } from 'react-router';
import { SITE_TITLE } from '~/global/config/settings';
import { toErrorMessage } from '~/global/utils/utils.error-message';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  CreateServiceAccountCredentialDocument,
  GetSettingsKeysDocument,
  RevokeServiceAccountCredentialDocument,
} from '~/__generated__/graphql';
import { SettingsKeysForm } from '~/routing/settings/components/SettingsKeysForm';
import { SettingsKeysIntroduction } from '~/routing/settings/components/SettingsKeysIntroduction';
import { SettingsKeysTable } from '~/routing/settings/components/SettingsKeysTable';
import { SettingsKeysToolbar } from '~/routing/settings/components/SettingsKeysToolbar';
import {
  parseCredentialIdFromFormData,
  parseExpiresAtFromFormData,
  parseServiceAccountIdFromFormData,
  resolveSelectedServiceAccountId,
  SETTINGS_KEYS_ACCOUNT_SEARCH_PARAM,
  SETTINGS_KEYS_PROBE_SERVICE_ACCOUNT_ID,
  type SettingsKeysActionData,
} from '~/routing/settings/utils/settings-keys-action';
import { optionalTrimmedString } from '~/routing/settings/utils/workspace-settings-action';
import type { Route } from '@/app/routes/+types/settings.keys';
import { SettingsKeysServiceAccountCredentials } from '~/routing/settings/components/SettingsKeysServiceAccountCredentials';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Keys',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.url;
  const searchParamAccountId = url.searchParams.get(
    SETTINGS_KEYS_ACCOUNT_SEARCH_PARAM,
  );

  const probeServiceAccountId =
    searchParamAccountId ?? SETTINGS_KEYS_PROBE_SERVICE_ACCOUNT_ID;

  const probe = await executeGraphqlWithAuth(
    args.request,
    GetSettingsKeysDocument,
    { serviceAccountId: probeServiceAccountId },
  );

  const selectedServiceAccountId = resolveSelectedServiceAccountId(
    probe.serviceAccounts,
    searchParamAccountId,
  );

  if (!selectedServiceAccountId) {
    return {
      credentials: [],
      selectedServiceAccountId: null,
      serviceAccounts: probe.serviceAccounts,
    };
  }

  if (selectedServiceAccountId === probeServiceAccountId) {
    return {
      credentials: probe.serviceAccountCredentials,
      selectedServiceAccountId,
      serviceAccounts: probe.serviceAccounts,
    };
  }

  const data = await executeGraphqlWithAuth(
    args.request,
    GetSettingsKeysDocument,
    { serviceAccountId: selectedServiceAccountId },
  );

  return {
    credentials: data.serviceAccountCredentials,
    selectedServiceAccountId,
    serviceAccounts: data.serviceAccounts,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Keys | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { credentials, selectedServiceAccountId, serviceAccounts } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  // Hooks

  // Setup
  const actionError =
    actionData && 'error' in actionData ? actionData.error : null;
  const createActionData =
    actionData &&
    'intent' in actionData &&
    actionData.intent === 'createCredential'
      ? actionData
      : null;
  const canManageCredentials = selectedServiceAccountId != null;

  // Handlers
  const handleServiceAccountChange = (serviceAccountId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(SETTINGS_KEYS_ACCOUNT_SEARCH_PARAM, serviceAccountId);
    setSearchParams(next);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (createActionData) {
      setCreateDialogOpen(true);
    }
  }, [createActionData]);

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <SettingsKeysIntroduction />
      <div className="flex flex-col gap-4">
        <SettingsKeysToolbar
          canCreate={canManageCredentials}
          createDialogOpen={createDialogOpen}
          onCreateDialogOpenChange={setCreateDialogOpen}
          onServiceAccountChange={handleServiceAccountChange}
          selectedServiceAccountId={selectedServiceAccountId}
          serviceAccounts={serviceAccounts}
        />
        <SettingsKeysTable
          actionError={actionError}
          canRevoke={canManageCredentials}
          className="bg-card"
          credentials={credentials}
        />
      </div>
      <SettingsKeysServiceAccountCredentials />
      <SettingsKeysForm
        actionData={createActionData}
        createDialogOpen={createDialogOpen}
        onCreateDialogOpenChange={setCreateDialogOpen}
        serviceAccountId={selectedServiceAccountId}
      />
    </GlobalScreen>
  );
}

export const action = async (
  args: Route.ActionArgs,
): Promise<SettingsKeysActionData> => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'createCredential') {
    const serviceAccountId = parseServiceAccountIdFromFormData(
      formData.get('serviceAccountId'),
    );
    const label = optionalTrimmedString(formData.get('label'));
    const expiresAt = parseExpiresAtFromFormData(formData.get('expiresAt'));

    if (!serviceAccountId) {
      return { error: 'Service account is required.' };
    }

    try {
      const data = await executeGraphqlWithAuth(
        args.request,
        CreateServiceAccountCredentialDocument,
        {
          input: {
            expiresAt: expiresAt ?? null,
            label: label ?? null,
            serviceAccountId,
          },
        },
      );

      const result = data.createServiceAccountCredential;
      if (!result?.token || !result.credential) {
        return { error: 'Failed to create credential.' };
      }

      return {
        credential: result.credential,
        intent: 'createCredential',
        token: result.token,
      };
    } catch (error) {
      return { error: toErrorMessage(error, 'Failed to create credential.') };
    }
  }

  if (intent === 'revokeCredential') {
    const credentialId = parseCredentialIdFromFormData(
      formData.get('credentialId'),
    );

    if (!credentialId) {
      return { error: 'Credential id is required.' };
    }

    try {
      await executeGraphqlWithAuth(
        args.request,
        RevokeServiceAccountCredentialDocument,
        { credentialId },
      );
      return { ok: true };
    } catch (error) {
      return { error: toErrorMessage(error, 'Failed to revoke credential.') };
    }
  }

  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
