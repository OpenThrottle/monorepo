import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn(
          'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
        ref={ref}
        role="tabpanel"
        {...rest}
      />
    );
  },
);

TabsContent.displayName = 'TabsContent';
