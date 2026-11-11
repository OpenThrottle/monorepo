import type { CmsComponentDebug } from '@openthrottle/react-router-cms-ui';
import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

/**
 * @description Lays its child components out on a responsive grid.
 * @public
 */
export interface LayoutGridProps {
  /**
   * @description The child components to be rendered via this Layout component.
   * @TJS-type children
   */
  readonly children: React.ReactNode;

  /**
   * @default "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8"
   * @description Classes to be applied on the component.
   * @TJS-type className
   */
  readonly className: string | undefined;
}

/**
 * @public
 */
export const LayoutGrid = (props: LayoutGridProps): React.ReactElement => {
  const { children, className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('grid', className)} data-testid="LayoutGrid">
      {children}
    </div>
  );
};

LayoutGrid.debug = {
  className: undefined,
} satisfies CmsComponentDebug;
