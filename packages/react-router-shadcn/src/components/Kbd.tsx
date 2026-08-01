import * as React from 'react';
import { cn } from '../utils/cn';

export interface KbdProps extends React.ComponentProps<'kbd'> {}

export const Kbd = React.forwardRef<React.ComponentRef<'kbd'>, KbdProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <kbd
        className={cn(
          'bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none',
          "[&_svg:not([class*='size-'])]:size-3",
          '[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10',
          className,
        )}
        data-slot="kbd"
        ref={ref}
        {...rest}
      />
    );
  },
);

Kbd.displayName = 'Kbd';

export interface KbdGroupProps extends React.ComponentProps<'div'> {}

export const KbdGroup = React.forwardRef<
  React.ComponentRef<'div'>,
  KbdGroupProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <kbd
      className={cn('inline-flex items-center gap-1', className)}
      data-slot="kbd-group"
      ref={ref}
      {...rest}
    />
  );
});

KbdGroup.displayName = 'KbdGroup';
