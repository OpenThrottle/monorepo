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
  toast,
} from '@openthrottle/react-router-shadcn';
import {
  getActionError,
  isActionSuccess,
} from '@openthrottle/react-router-utils';
import * as React from 'react';
import { useFetcher } from 'react-router';

import type { action as settingsConnectionsAction } from '~/routes/settings.connections';
import { SETTINGS_CONNECTIONS_COPY as COPY } from '~/routing/settings/data/copy';

export interface SettingsConnectionsRevokeCellProps {
  appName: string;
  grantId: string;
}

export const SettingsConnectionsRevokeCell = (
  props: SettingsConnectionsRevokeCellProps,
): React.ReactElement => {
  const { appName, grantId } = props;

  // Hooks
  const fetcher = useFetcher<typeof settingsConnectionsAction>();
  const wasBusyRef = React.useRef(false);
  const [open, setOpen] = React.useState(false);

  // Setup
  const RevokeForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';
  const submitLabel = isSubmitting ? COPY.revoking : COPY.revokeConfirm;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (wasBusyRef.current && !isSubmitting) {
      if (isActionSuccess(fetcher.data)) {
        toast.success(COPY.revokeSucceeded);
        setOpen(false);
      } else {
        toast.error(getActionError(fetcher.data) ?? COPY.revokeFailed);
      }
    }
    wasBusyRef.current = isSubmitting;
  }, [fetcher.data, isSubmitting]);

  // 🔌 Short Circuit

  return (
    <div className="px-2 py-2 text-right">
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogTrigger asChild={true}>
          <Button
            aria-label={`${COPY.revoke} ${appName}`}
            data-testid={`SettingsConnectionsTable-revoke-${grantId}`}
            disabled={isSubmitting}
            size="xs"
            type="button"
            variant="outline"
          >
            {COPY.revoke}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{COPY.revokeTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {COPY.revokeDescriptionPrefix}
              <strong>{appName}</strong>
              {COPY.revokeDescriptionSuffix}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <RevokeForm action="/settings/connections" method="post">
            <input name="grantId" type="hidden" value={grantId} />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting} type="button">
                {COPY.revokeCancel}
              </AlertDialogCancel>
              <Button
                data-testid={`SettingsConnectionsTable-revoke-submit-${grantId}`}
                disabled={isSubmitting}
                type="submit"
                variant="destructive"
              >
                {submitLabel}
              </Button>
            </AlertDialogFooter>
          </RevokeForm>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
