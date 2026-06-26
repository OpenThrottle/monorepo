import * as React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent whitespace-nowrap transition-[color,box-shadow]' +
    ' text-foreground transition-all' +
    ' focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50' +
    ' aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40' +
    ' [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    defaultVariants: {
      color: 'default',
      variant: 'default',
    },
    variants: {
      // Intentional fixed-palette accent colors. Unlike `variant` (which uses
      // semantic theme tokens), these `color` options are a deliberate, stable
      // set of named hues for categorical/status tagging (e.g. labels, chips)
      // and are NOT meant to follow theme/dark-mode token overrides. `accent`
      // and `default` are the only theme-aware entries here; the rest map to
      // raw Tailwind palette colors on purpose. Treat this list as a public,
      // versioned contract — do not silently remap to semantic tokens.
      color: {
        accent: `border-accent/50 bg-accent/20 hover:bg-accent/50`,
        amber: `border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/50`,
        blue: `border-blue-500/50 bg-blue-500/20 hover:bg-blue-500/50`,
        default: `border-accent/50 bg-accent/20 hover:bg-accent/50`,
        green: `border-green-500/50 bg-green-500/20 hover:bg-green-500/50`,
        lime: `border-lime-500/50 bg-lime-500/20 hover:bg-lime-500/50`,
        orange: `border-orange-500/50 bg-orange-500/20 hover:bg-orange-500/50`,
        red: `border-red-500/50 bg-red-500/20 hover:bg-red-500/50`,
        sky: `border-sky-500/50 bg-sky-500/20 hover:bg-sky-500/50`,
        slate: `border-slate-500/50 bg-slate-500/20 hover:bg-slate-500/50`,
        violet: `border-violet-500/50 bg-violet-500/20 hover:bg-violet-500/50`,
        yellow: `border-yellow-500/50 bg-yellow-500/20 hover:bg-yellow-500/50`,
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
        default: ``,
        destructive: ``,
        ghost: ``,
        link: ``,
        outline: ``,
        secondary: ``,
        // default: `bg-primary text-primary-foreground [a&]:hover:bg-primary/90`,
        // destructive: `bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90`,
        // ghost: `[a&]:hover:bg-accent [a&]:hover:text-accent-foreground`,
        // link: `text-primary underline-offset-4 [a&]:hover:underline`,
        // outline: `border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground`,
        // secondary: `bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90`,
      },
    },
  },
);

type BaseProps = React.ComponentPropsWithoutRef<'span'>;
type BadgeVariants = VariantProps<typeof badgeVariants>;

export interface BadgeProps extends BaseProps, BadgeVariants {
  asChild?: boolean;
  color?:
    | 'accent'
    | 'amber'
    | 'blue'
    | 'default'
    | 'green'
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
