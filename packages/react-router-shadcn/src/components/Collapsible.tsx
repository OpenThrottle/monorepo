import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { cn } from '../utils/cn';

export type CollapsibleProps = React.ComponentPropsWithoutRef<
  typeof CollapsiblePrimitive.Root
>;

export const Collapsible = CollapsiblePrimitive.Root;

export type CollapsibleTriggerProps = React.ComponentPropsWithoutRef<
  typeof CollapsiblePrimitive.CollapsibleTrigger
>;

export const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

export interface CollapsibleContentProps extends React.ComponentPropsWithoutRef<
  typeof CollapsiblePrimitive.CollapsibleContent
> {}

export const CollapsibleContent = React.forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  CollapsibleContentProps
>((props, ref): React.ReactElement => {
  const { className, children, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CollapsiblePrimitive.CollapsibleContent
      className={cn(
        'overflow-hidden transition-[height] duration-200 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className,
      )}
      ref={ref}
      {...rest}
    >
      {children}
    </CollapsiblePrimitive.CollapsibleContent>
  );
});

CollapsibleContent.displayName =
  CollapsiblePrimitive.CollapsibleContent.displayName ?? 'CollapsibleContent';
