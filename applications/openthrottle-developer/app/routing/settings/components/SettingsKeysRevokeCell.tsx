import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  toast,
} from '@openthrottle/react-router-shadcn';
import {
  getActionError,
  isActionSuccess,
} from '@openthrottle/react-router-utils';
import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';
import type { action as settingsKeysAction } from '~/routes/settings.keys';
import {
  credentialDisplayName,
  getSettingsKeysCredentialStatus,
} from '~/routing/settings/utils/settings-keys-credential';

export interface SettingsKeysRevokeCellProps {
  canRevoke: boolean;
  credential: ServiceAccountCredentialFieldsFragment;
}

export const SettingsKeysRevokeCell = (
  props: SettingsKeysRevokeCellProps,
): React.ReactElement | null => {
  const { canRevoke, credential } = props;

  // Hooks
  const revokeBusyRef = React.useRef(false);
  const fetcher = useFetcher<typeof settingsKeysAction>();
  const revalidator = useRevalidator();
  const [open, setOpen] = React.useState(false);

  // Setup
  const RevokeForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';
  const status = getSettingsKeysCredentialStatus(credential);
  const displayName = credentialDisplayName(credential);

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcher.state !== 'idle';

    if (revokeBusyRef.current && !busy) {
      const data = fetcher.data;
      const error = getActionError(data);

      if (isActionSuccess(data)) {
        toast.success('Credential revoked.');
        revalidator.revalidate();
        setOpen(false);
      } else if (error != null) {
        toast.error(error);
      }
    }
    revokeBusyRef.current = busy;
  }, [fetcher.state, fetcher.data, revalidator]);

  // 🔌 Short Circuit
  if (status !== 'active') {
    return <span className="text-muted-foreground px-3 py-2 text-xs">—</span>;
  }

  return (
    <div className="px-3 py-2">
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogTrigger asChild={true}>
          <Button
            aria-label={`Revoke credential ${displayName}`}
            data-testid={`SettingsKeysTable-revoke-trigger-${credential.id}`}
            disabled={!canRevoke || isSubmitting}
            size="xs"
            type="button"
            variant="outline"
          >
            {isSubmitting ? 'Revoking…' : 'Revoke'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke credential?</AlertDialogTitle>
            <AlertDialogDescription>
              Revoking &quot;{displayName}&quot; ({credential.prefix}) stops
              this token from authenticating on the next request. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <RevokeForm action="/settings/keys" method="post">
            <Input name="intent" type="hidden" value="revokeCredential" />
            <Input name="credentialId" type="hidden" value={credential.id} />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting} type="button">
                Cancel
              </AlertDialogCancel>
              <Button
                data-testid={`SettingsKeysTable-revoke-submit-${credential.id}`}
                disabled={!canRevoke || isSubmitting}
                type="submit"
                variant="destructive"
              >
                {isSubmitting ? 'Revoking…' : 'Revoke'}
              </Button>
            </AlertDialogFooter>
          </RevokeForm>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
