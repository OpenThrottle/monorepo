import * as React from 'react';
import { Dialog, DialogContent } from '@openthrottle/react-router-shadcn';
import { useUrlSyncedOverlay } from '../hooks/use-url-synced-overlay';

export interface GlobalModalProps extends React.PropsWithChildren {
  readonly param: string;
  readonly value: string;
}

export const GlobalModal = (props: GlobalModalProps) => {
  const { children, param: paramProp = 'modal', value } = props;

  const { onOpenChange, open } = useUrlSyncedOverlay({
    openValue: value,
    param: paramProp,
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm data-[state=closed]:slide-out-to-top-[0%] ">
        {children}
      </DialogContent>
    </Dialog>
  );
};

GlobalModal.key = 'daily-stats';
