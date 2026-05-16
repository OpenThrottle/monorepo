import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const emptyMediaVariants = cva('flex items-center justify-center', {
  defaultVariants: {
    variant: 'default',
  },
  variants: {
    variant: {
      default: '',
      icon: 'rounded-full bg-muted p-3 text-muted-foreground',
    },
  },
});

type EmptyMediaVariants = VariantProps<typeof emptyMediaVariants>;

export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, ...props }, ref) => {
    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Empty.displayName = 'Empty';

export interface EmptyHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const EmptyHeader = React.forwardRef<HTMLDivElement, EmptyHeaderProps>(
  ({ className, ...props }, ref) => {
    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn('flex flex-col items-center gap-2', className)}
        ref={ref}
        {...props}
      />
    );
  },
);
EmptyHeader.displayName = 'EmptyHeader';

export interface EmptyMediaProps
  extends React.HTMLAttributes<HTMLDivElement>, EmptyMediaVariants {}

export const EmptyMedia = React.forwardRef<HTMLDivElement, EmptyMediaProps>(
  ({ className, variant, ...props }, ref) => {
    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn(emptyMediaVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
EmptyMedia.displayName = 'EmptyMedia';

export interface EmptyTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const EmptyTitle = React.forwardRef<HTMLHeadingElement, EmptyTitleProps>(
  ({ className, ...props }, ref) => {
    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <h3
        className={cn('text-lg leading-none tracking-tight', className)}
        ref={ref}
        {...props}
      />
    );
  },
);
EmptyTitle.displayName = 'EmptyTitle';

export interface EmptyDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  EmptyDescriptionProps
>(({ className, ...props }, ref) => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      ref={ref}
      {...props}
    />
  );
});
EmptyDescription.displayName = 'EmptyDescription';

export interface EmptyContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const EmptyContent = React.forwardRef<HTMLDivElement, EmptyContentProps>(
  ({ className, ...props }, ref) => {
    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn('flex flex-col items-center gap-2', className)}
        ref={ref}
        {...props}
      />
    );
  },
);
EmptyContent.displayName = 'EmptyContent';
