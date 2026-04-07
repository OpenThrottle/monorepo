import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <tr
        className={cn(
          'border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
          className,
        )}
        ref={ref}
        {...rest}
      />
    );
  },
);

TableRow.displayName = 'TableRow';
