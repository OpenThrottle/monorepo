'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface DrawerFooterProps extends React.ComponentPropsWithoutRef<'div'> {}

export const DrawerFooter = React.forwardRef<HTMLDivElement, DrawerFooterProps>(
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
        className={cn('mt-auto flex flex-col gap-2 p-4', className)}
        data-slot="drawer-footer"
        ref={ref}
        {...rest}
      />
    );
  },
);

DrawerFooter.displayName = 'DrawerFooter';
