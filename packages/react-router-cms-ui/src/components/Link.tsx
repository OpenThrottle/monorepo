import { Button as ShadcnButton } from '@openthrottle/react-router-shadcn';
import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link as RouterLink } from 'react-router';

import type { CmsComponentDebug } from '../types';

/**
 * @public
 * @description A call-to-action link styled as a button, navigating with
 * React Router.
 */
export interface LinkProps {
  /**
   * @default "uppercase"
   * @description Classes to be applied on the component.
   * @TJS-type className
   */
  readonly className?: string;

  /**
   * @default "Call to action"
   * @description The label shown on the link
   */
  readonly cta: string;

  /**
   * @default "/"
   * @description The path or URL to navigate to
   */
  readonly to: string;
}

/**
 * @public
 */
export const Link = (props: LinkProps): React.ReactElement => {
  const { className, cta, to } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ShadcnButton asChild={true} className={cn('h-auto px-8 py-3', className)}>
      <RouterLink to={to}>{cta}</RouterLink>
    </ShadcnButton>
  );
};

Link.debug = {
  className: 'border-orange-500',
} satisfies CmsComponentDebug;
