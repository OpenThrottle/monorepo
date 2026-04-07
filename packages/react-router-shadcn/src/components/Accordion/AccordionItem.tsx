import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { cn } from '../../utils/cn';

export interface AccordionItemProps extends React.ComponentPropsWithoutRef<
  typeof AccordionPrimitive.Item
> {}

const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  AccordionItemProps
>((props, ref) => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AccordionPrimitive.Item
      className={cn('border-b', className)}
      ref={ref}
      {...rest}
    />
  );
});

AccordionItem.displayName = 'AccordionItem';
