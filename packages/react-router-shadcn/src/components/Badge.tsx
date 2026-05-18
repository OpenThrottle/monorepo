import * as React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        destructive:
          'bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90',
        ghost: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 [a&]:hover:underline',
        outline:
          'border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
      },
    },
  },
);

type BadgeVariants = VariantProps<typeof badgeVariants>;

export interface BadgeProps
  extends React.ComponentPropsWithoutRef<'span'>, BadgeVariants {
  asChild?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (props, ref): React.ReactElement => {
    const { asChild = false, className, variant = 'default', ...rest } = props;
    const Component = asChild ? SlotPrimitive.Slot : 'span';

    return (
      <Component
        className={cn(badgeVariants({ variant }), className)}
        data-slot="badge"
        data-variant={variant}
        ref={ref}
        {...rest}
      />
    );
  },
);

Badge.displayName = 'Badge';
