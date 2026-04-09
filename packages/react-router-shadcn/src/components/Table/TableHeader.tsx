import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <thead className={cn('[&_tr]:border-b', className)} ref={ref} {...rest} />
  );
});

TableHeader.displayName = 'TableHeader';
