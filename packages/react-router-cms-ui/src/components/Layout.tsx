import {
  cn,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { COPY } from '../data/data.copy';
import type { CmsComponentDebug } from '../types';

/**
 * @public
 * @description This component is essentially a "div" that we can use to
 * wrap around other components, or "children" in our case.
 */
export interface LayoutProps {
  /**
   * @default []
   * @description The child components to be rendered via this Layout component.
   * @cmsWidget children
   */
  readonly children: React.ReactNode;

  /**
   * @description Classes to be applied on the component.
   * @cmsWidget className
   */
  readonly className?: string;
}

/**
 * @public
 */
export const Layout = (props: LayoutProps): React.ReactElement => {
  const { children, className } = props;

  // Hooks

  // Setup
  const hasChildren = React.Children.count(children) > 0;
  const { emptyDescription, emptyTitle } = COPY.layout;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (hasChildren) return <div className={cn(className)}>{children}</div>;

  return (
    <div className={cn(className)}>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
};

Layout.debug = {
  className: 'border-pink-500',
} satisfies CmsComponentDebug;
