import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableBodyProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <tbody
      className={cn('[&_tr:last-child]:border-0', className)}
      ref={ref}
      {...rest}
    />
  );
});

TableBody.displayName = 'TableBody';
