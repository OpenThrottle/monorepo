import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';
import { Button, type ButtonProps } from './Button';

const inputGroupButtonVariants = cva('flex items-center gap-2 text-sm shadow-none', {
  defaultVariants: {
    size: 'xs',
  },
  variants: {
    size: {
      'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
      'icon-xs':
        'size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0',
      sm: 'h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5',
      xs: 'h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*="size-"])]:size-3.5',
    },
  },
});

export interface InputGroupButtonProps
  extends Omit<ButtonProps, 'size' | 'variant'>,
    VariantProps<typeof inputGroupButtonVariants> {
  readonly size?: 'xs' | 'sm' | 'icon-xs' | 'icon-sm';
  readonly variant?: ButtonProps['variant'];
}

export const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  InputGroupButtonProps
>((props, ref): React.ReactElement => {
  const {
    className,
    size = 'xs',
    type = 'button',
    variant = 'ghost',
    ...rest
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Button
      className={cn(inputGroupButtonVariants({ size }), className)}
      ref={ref}
      type={type}
      variant={variant}
      {...rest}
    />
  );
});

InputGroupButton.displayName = 'InputGroupButton';
