import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../utils/cn';

export const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current',
      },
    },
  },
);

export interface AlertProps
  extends React.ComponentProps<'div'>, VariantProps<typeof alertVariants> {}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (props, ref): React.ReactElement => {
    const { className, variant, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn(alertVariants({ variant }), className)}
        data-slot="alert"
        ref={ref}
        role="alert"
        {...rest}
      />
    );
  },
);

Alert.displayName = 'Alert';
