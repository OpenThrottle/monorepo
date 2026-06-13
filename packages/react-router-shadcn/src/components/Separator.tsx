'use client';

import * as React from 'react';
import { Separator as SeparatorPrimitive } from 'radix-ui';
import { cn } from '../utils/cn';

type BaseProps = React.ComponentProps<typeof SeparatorPrimitive.Root>;

export interface SeparatorProps extends BaseProps {}

export const Separator = (props: SeparatorProps): React.ReactElement => {
  const {
    className,
    decorative = true,
    orientation = 'horizontal',
    ...rest
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SeparatorPrimitive.Root
      className={cn(
        'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className,
      )}
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      {...rest}
    />
  );
};
