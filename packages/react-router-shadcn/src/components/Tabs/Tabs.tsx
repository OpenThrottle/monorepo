import { Tabs as TabsPrimitive } from 'radix-ui';
import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TabsProps extends React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Root
> {}

export const Tabs = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Root>,
  TabsProps
>((props, ref): React.ReactElement => {
  const { className, orientation = 'horizontal', ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsPrimitive.Root
      className={cn(
        'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col',
        className,
      )}
      data-orientation={orientation}
      data-slot="tabs"
      orientation={orientation}
      ref={ref}
      {...rest}
    />
  );
});

Tabs.displayName = TabsPrimitive.Root.displayName;
