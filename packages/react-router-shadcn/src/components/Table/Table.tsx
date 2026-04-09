import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div className="relative w-full overflow-auto">
        <table
          className={cn('w-full caption-bottom text-sm', className)}
          ref={ref}
          {...rest}
        />
      </div>
    );
  },
);

Table.displayName = 'Table';
