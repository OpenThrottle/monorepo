import { Tabs as TabsPrimitive } from 'radix-ui';
import * as React from 'react';
import { cn } from '../../utils/cn';
import { tabsTriggerVariants } from './tabsTriggerVariants';

export interface TabsTriggerProps extends React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Trigger
> {}

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  return (
    <TabsPrimitive.Trigger
      className={cn(tabsTriggerVariants(), className)}
      data-slot="tabs-trigger"
      ref={ref}
      {...rest}
    />
  );
});

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
