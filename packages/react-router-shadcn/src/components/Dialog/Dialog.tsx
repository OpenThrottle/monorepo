import * as React from 'react';
import { cn } from '../../utils/cn';

export interface DialogProps {
  readonly className?: string;
}

export const Dialog = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div className={cn(className)} ref={ref} role="dialog" {...rest} />;
});

Dialog.displayName = 'Dialog';
