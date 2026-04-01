'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * @description Blockquote component for testimonials and quoted text. Matches shadcn Typography blockquote styling.
 * @see https://ui.shadcn.com/docs/components/typography
 */
const Blockquote = React.forwardRef<
  HTMLQuoteElement,
  React.HTMLAttributes<HTMLQuoteElement>
>(({ className, ...props }, ref) => (
  <blockquote
    className={cn('mt-6 border-l-2 border-primary pl-6 italic', className)}
    ref={ref}
    {...props}
  />
));
Blockquote.displayName = 'Blockquote';

export { Blockquote };
