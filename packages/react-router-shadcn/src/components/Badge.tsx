import * as React from 'react';
import { cn } from '../utils/cn';
import { badgeVariants, BadgeVariants } from '../config/badgeVariants';

type BaseProps = React.HTMLAttributes<HTMLDivElement>;

export interface BadgeProps extends BaseProps, BadgeVariants {}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (props, ref): React.ReactElement => {
    const { className, size, variant, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn(badgeVariants({ size, variant }), className)}
        ref={ref}
        {...rest}
      />
    );
  },
);
