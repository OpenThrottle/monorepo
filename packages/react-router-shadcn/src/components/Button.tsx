import * as React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

export const buttonVariants = cva(
  "cursor-pointer inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: `h-9 px-4 py-2 has-[>svg]:px-3`,
        icon: `size-9`,
        'icon-lg': `size-10`,
        'icon-sm': `size-8`,
        'icon-xs': `size-6 rounded-md [&_svg:not([class*="size-"])]:size-3`,
        lg: `h-10 rounded-md px-6 has-[>svg]:px-4`,
        sm: `h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5`,
        xs: `h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*="size-"])]:size-3`,
      },
      variant: {
        brand: `bg-accent text-foreground hover:bg-accent/90`,
        default: `bg-primary text-primary-foreground hover:bg-primary/90`,
        destructive: `bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40`,
        ghost: `hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50`,
        link: `text-primary underline-offset-4 hover:underline`,
        outline: `border bg-background shadow-xs hover:bg-accent text-foreground/70 hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50`,
        secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/80`,
      },
    },
  },
);

type BaseProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
type ButtonVariants = VariantProps<typeof buttonVariants>;

export interface ButtonProps extends BaseProps, ButtonVariants {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref): React.ReactElement => {
    const {
      asChild = false,
      className,
      size = 'default',
      variant = 'default',
      ...rest
    } = props;

    // Hooks

    // Setup
    const Component = asChild ? SlotPrimitive.Slot : 'button';

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <Component
        className={cn(buttonVariants({ size, variant }), className)}
        data-size={size}
        data-slot="button"
        data-variant={variant}
        ref={ref}
        {...rest}
      />
    );
  },
);

Button.displayName = 'Button';
