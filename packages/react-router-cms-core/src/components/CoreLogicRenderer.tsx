import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { CmsFragment } from '../types/cms-fragment';

/**
 * @public
 */
export interface CoreLogicRendererProps {
  readonly className: string | undefined;
  readonly fragments: readonly CmsFragment[];
}

/**
 * @description Lists only the logic fragments of a tree (a `typename` containing "logic"), so an
 * editor can see where a layout branches.
 * @public
 */
export const CoreLogicRenderer = (
  props: CoreLogicRendererProps,
): React.ReactElement => {
  const { className, fragments } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const renderFragment = (fragment: CmsFragment): React.ReactElement => {
    const { children, typename, uuid } = fragment;
    const isLogic = typename.toLowerCase().includes('logic');

    if (isLogic) {
      return (
        <h2 className="font-medium" key={uuid}>
          {typename}
        </h2>
      );
    }

    return (
      <React.Fragment key={uuid}>{children.map(renderFragment)}</React.Fragment>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('p-4 text-xs', className)}
      data-testid="CoreLogicRenderer"
    >
      {fragments.map(renderFragment)}
    </div>
  );
};
