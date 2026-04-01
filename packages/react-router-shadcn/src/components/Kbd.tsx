import * as React from 'react';
import { cn } from '../utils/cn';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

/**
 * @description Displays a keyboard key with standard kbd styling. Use for shortcuts (e.g. Ctrl, ⌘).
 */
export const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, ...props }, ref) => (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100',
        className,
      )}
      ref={ref as React.Ref<HTMLUnknownElement>}
      {...props}
    />
  ),
);
Kbd.displayName = 'Kbd';

export interface KbdGroupProps extends React.HTMLAttributes<HTMLSpanElement> {}

/**
 * @description Groups multiple Kbd components with a separator (e.g. "Ctrl + B").
 */
export const KbdGroup = React.forwardRef<HTMLSpanElement, KbdGroupProps>(
  ({ className, ...props }, ref) => (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      ref={ref}
      {...props}
    />
  ),
);
KbdGroup.displayName = 'KbdGroup';
