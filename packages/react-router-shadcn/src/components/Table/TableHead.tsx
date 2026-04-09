import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;
    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <th
        className={cn(
          'h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
          className,
        )}
        ref={ref}
        {...rest}
      />
    );
  },
);

TableHead.displayName = 'TableHead';
