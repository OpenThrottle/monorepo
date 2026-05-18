import * as React from 'react';
import { Accordion as AccordionPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface AccordionContentProps extends React.ComponentPropsWithoutRef<
  typeof AccordionPrimitive.Content
> {}

export const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  AccordionContentProps
>((props, ref) => {
  const { className, children, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AccordionPrimitive.Content
      className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      ref={ref}
      {...rest}
    >
      <div className={cn('pb-4 pt-0', className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
});

AccordionContent.displayName = AccordionPrimitive.Content.displayName;
