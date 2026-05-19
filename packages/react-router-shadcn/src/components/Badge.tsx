import * as React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent whitespace-nowrap transition-[color,box-shadow]' +
    // ' px-2 py-0.5 text-xs font-medium' +
    ' focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50' +
    ' aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40' +
    ' [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    defaultVariants: {
      color: 'default',
      variant: 'default',
    },
    variants: {
      color: {
        amber: `border-amber-500/50 bg-amber-500/40 hover:bg-amber-500/60`,
        default: `border-amber-500/50 bg-amber-500/40 hover:bg-amber-500/60`,
        lime: `border-lime-500/50 bg-lime-500/40 hover:bg-lime-500/60`,
        orange: `border-orange-500/50 bg-orange-500/40 hover:bg-orange-500/60`,
        red: `border-red-500/50 bg-red-500/40 hover:bg-red-500/60`,
        sky: `border-sky-500/50 bg-sky-500/40 hover:bg-sky-500/60`,
        slate: `border-slate-500/50 bg-slate-500/40 hover:bg-slate-500/60`,
        violet: `border-violet-500/50 bg-violet-500/40 hover:bg-violet-500/60`,
        yellow: `border-yellow-400/50 bg-yellow-400/40 hover:bg-yellow-400/60`,
      },
      size: {
        '2xl': 'text-2xl px-4 py-2',
        '3xl': 'text-3xl px-4 py-2',
        default: 'text-xs px-2 py-1',
        lg: 'text-lg px-3 py-2',
        sm: 'text-sm px-2 py-1',
        xl: 'text-xl px-4 py-2',
        xs: 'text-xs px-1.5 py-0.5',
      },
      variant: {
        default: `--bg-primary text-primary-foreground [a&]:hover:--bg-primary/90`,
        destructive: `--bg-destructive text-white focus-visible:ring-destructive/20 dark:--bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:--bg-destructive/90`,
        ghost: `[a&]:hover:--bg-accent [a&]:hover:text-accent-foreground`,
        link: `text-primary underline-offset-4 [a&]:hover:underline`,
        outline: `border-border text-foreground [a&]:hover:--bg-accent [a&]:hover:text-accent-foreground`,
        secondary: `--bg-secondary text-secondary-foreground [a&]:hover:--bg-secondary/90`,
      },
    },
  },
);

type BaseProps = React.ComponentPropsWithoutRef<'span'>;
type BadgeVariants = VariantProps<typeof badgeVariants>;

export interface BadgeProps extends BaseProps, BadgeVariants {
  asChild?: boolean;
  color?:
    | 'amber'
    | 'default'
    | 'lime'
    | 'orange'
    | 'red'
    | 'sky'
    | 'slate'
    | 'violet'
    | 'yellow';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (props, ref): React.ReactElement => {
    const {
      asChild = false,
      className,
      color = 'default',
      size = 'default',
      variant = 'default',
      ...rest
    } = props;

    // Hooks

    // Setup
    const Component = asChild ? SlotPrimitive.Slot : 'span';

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <Component
        className={cn(badgeVariants({ color, size, variant }), className)}
        data-slot="badge"
        data-variant={variant}
        ref={ref}
        {...rest}
      />
    );
  },
);

Badge.displayName = 'Badge';
