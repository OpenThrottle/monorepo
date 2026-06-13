import * as React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';
import { Separator } from './Separator';

export const buttonGroupVariants = cva(
  'flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*="w-"])]:w-fit [&>input]:flex-1',
  {
    defaultVariants: {
      orientation: 'horizontal',
    },
    variants: {
      orientation: {
        horizontal:
          '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none',
        vertical:
          'flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none',
      },
    },
  },
);

export interface ButtonGroupProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof buttonGroupVariants> {}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  (props, ref): React.ReactElement => {
    const { className, orientation = 'horizontal', ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn(buttonGroupVariants({ orientation }), className)}
        data-orientation={orientation}
        data-slot="button-group"
        ref={ref}
        role="group"
        {...rest}
      />
    );
  },
);

ButtonGroup.displayName = 'ButtonGroup';

export interface ButtonGroupTextProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly asChild?: boolean;
}

export const ButtonGroupText = React.forwardRef<
  HTMLDivElement,
  ButtonGroupTextProps
>((props, ref): React.ReactElement => {
  const { asChild = false, className, ...rest } = props;

  // Hooks

  // Setup

  const Comp = asChild ? SlotPrimitive.Slot : 'div';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Comp
      className={cn(
        'bg-muted flex items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});

ButtonGroupText.displayName = 'ButtonGroupText';

export interface ButtonGroupSeparatorProps extends React.ComponentPropsWithoutRef<
  typeof Separator
> {}

export const ButtonGroupSeparator = React.forwardRef<
  React.ComponentRef<typeof Separator>,
  ButtonGroupSeparatorProps
>((props, ref): React.ReactElement => {
  const { className, orientation = 'vertical', ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Separator
      className={cn(
        'bg-input relative m-0! self-stretch data-[orientation=vertical]:h-auto',
        className,
      )}
      data-slot="button-group-separator"
      orientation={orientation}
      ref={ref}
      {...rest}
    />
  );
});

ButtonGroupSeparator.displayName = 'ButtonGroupSeparator';
