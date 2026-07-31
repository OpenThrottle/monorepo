'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

export interface BlockquoteProps extends React.HTMLAttributes<HTMLQuoteElement> {}

/**
 * @description Blockquote component for testimonials and quoted text. Matches shadcn Typography blockquote styling.
 * @see https://ui.shadcn.com/docs/components/typography
 */
export const Blockquote = React.forwardRef<HTMLQuoteElement, BlockquoteProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <blockquote
        className={cn('border-primary mt-6 border-l-2 pl-6 italic', className)}
        ref={ref}
        {...rest}
      />
    );
  },
);

Blockquote.displayName = 'Blockquote';
