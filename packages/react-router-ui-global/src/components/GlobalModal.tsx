import * as React from 'react';
import { Dialog, DialogContent } from '@openthrottle/react-router-shadcn';
import { useUrlSyncedOverlay } from '../hooks/useUrlSyncedOverlay';

export interface GlobalModalProps extends React.PropsWithChildren {
  readonly param: string;
  readonly value: string;
}

export const GlobalModal = (props: GlobalModalProps): React.ReactElement => {
  const { children, param: paramProp = 'modal', value } = props;

  // Hooks
  const { onOpenChange, open } = useUrlSyncedOverlay({
    // clearParamsOnClose: ['keep'],
    openValue: value,
    param: paramProp,
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="data-[state=closed]:slide-out-to-top-[0%] max-h-svh max-w-5xl overflow-y-auto">
        {children}
      </DialogContent>
    </Dialog>
  );
};

GlobalModal.key = 'daily-stats';
