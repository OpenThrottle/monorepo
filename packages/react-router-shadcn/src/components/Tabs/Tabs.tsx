import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return <div className={cn(className)} ref={ref} {...rest} />;
  },
);

Tabs.displayName = 'Tabs';
