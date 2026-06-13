import * as React from 'react';
import { cn } from '../utils/cn';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <textarea
        className={cn(
          'border-input bg-background border',
          'ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex rounded-md px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'min-h-[80px] w-full',
          className,
        )}
        ref={ref}
        {...rest}
      />
    );
  },
);

TextArea.displayName = 'TextArea';
