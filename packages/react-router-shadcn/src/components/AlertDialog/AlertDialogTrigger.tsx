import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '../../utils/cn';

export interface AlertDialogTriggerProps {
  readonly className?: string;
}

export const AlertDialogTrigger = (props: AlertDialogTriggerProps) => {
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
      data-testid="AlertDialogTrigger"
    >
      <h2>AlertDialogTrigger</h2>
    </div>
  );
};
