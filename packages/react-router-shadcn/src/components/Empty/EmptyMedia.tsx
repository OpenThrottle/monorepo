import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../utils/cn';

const emptyMediaVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-6",
      },
    },
  },
);

export type EmptyMediaProps = React.ComponentProps<'div'> &
  VariantProps<typeof emptyMediaVariants>;

export const EmptyMedia = React.forwardRef<HTMLDivElement, EmptyMediaProps>(
  (props, ref): React.ReactElement => {
    const { className, variant = 'default', ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn(emptyMediaVariants({ variant }), className)}
        data-slot="empty-icon"
        data-variant={variant}
        ref={ref}
        {...rest}
      />
    );
  },
);

EmptyMedia.displayName = 'EmptyMedia';
