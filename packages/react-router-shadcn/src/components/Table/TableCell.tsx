import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;
    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <td
        className={cn(
          'p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
          className,
        )}
        ref={ref}
        {...rest}
      />
    );
  },
);

TableCell.displayName = 'TableCell';
