import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '../../utils/cn';

export interface AlertDialogProps {
  readonly className?: string;
}

export const AlertDialog = (props: AlertDialogProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="AlertDialog">
      <h2>AlertDialog</h2>
    </div>
  );
};
