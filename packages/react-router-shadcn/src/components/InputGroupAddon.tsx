import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const inputGroupAddonVariants = cva(
  'flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*="size-"])]:size-4 group-data-[disabled=true]/input-group:opacity-50',
  {
    defaultVariants: {
      align: 'inline-start',
    },
    variants: {
      align: {
        'block-end':
          '[.border-t]:pt-3 order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5',
        'block-start':
          '[.border-b]:pb-3 order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5',
        'inline-end':
          'order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]',
        'inline-start':
          'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
      },
    },
  },
);

export interface InputGroupAddonProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inputGroupAddonVariants> {}

export const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  InputGroupAddonProps
>((props, ref): React.ReactElement => {
  const { align = 'inline-start', className, onMouseDown, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>): void => {
    const { target } = event;
    if (target instanceof Element && target.closest('button')) {
      return;
    }

    event.preventDefault();
    const root = event.currentTarget.closest('[data-slot=input-group]');
    const control = root?.querySelector<HTMLElement>(
      '[data-slot=input-group-control]',
    );
    control?.focus();

    onMouseDown?.(event);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(inputGroupAddonVariants({ align }), className)}
      data-align={align}
      data-slot="input-group-addon"
      onMouseDown={handleMouseDown}
      ref={ref}
      role="group"
      {...rest}
    />
  );
});

InputGroupAddon.displayName = 'InputGroupAddon';
