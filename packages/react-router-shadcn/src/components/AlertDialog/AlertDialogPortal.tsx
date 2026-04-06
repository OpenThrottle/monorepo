import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '../../utils/cn';

export interface AlertDialogPortalProps {
  readonly className?: string;
}

export const AlertDialogPortal = (props: AlertDialogPortalProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('p-4', className)}
      data-testid="AlertDialogPortal"
    >
      <h2>AlertDialogPortal</h2>
    </div>
  );
};
