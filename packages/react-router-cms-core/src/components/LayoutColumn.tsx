import type { CmsComponentDebug } from '@openthrottle/react-router-cms-ui';
import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

/**
 * @description Stacks its child components in a column.
 * @public
 */
export interface LayoutColumnProps {
  /**
   * @description The child components to be rendered via this Layout component.
   * @TJS-type children
   */
  readonly children: React.ReactNode;

  /**
   * @default "flex gap-4 flex-col"
   * @description Classes to be applied on the component.
   * @TJS-type className
   */
  readonly className: string | undefined;
}

/**
 * @public
 */
export const LayoutColumn = (props: LayoutColumnProps): React.ReactElement => {
  const { children, className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn(className)} data-testid="LayoutColumn">
      {children}
    </div>
  );
};

LayoutColumn.debug = {
  className: undefined,
} satisfies CmsComponentDebug;
