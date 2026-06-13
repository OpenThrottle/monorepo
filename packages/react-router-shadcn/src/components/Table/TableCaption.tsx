import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {
  readonly className?: string;
}

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  TableCaptionProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <caption
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      ref={ref}
      {...rest}
    />
  );
});

TableCaption.displayName = 'TableCaption';
