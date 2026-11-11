import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { CmsFragment } from '../types/cms-fragment';

/**
 * @public
 */
export interface CoreLayoutRendererProps {
  readonly className: string | undefined;
  readonly fragments: readonly CmsFragment[];
}

/**
 * @description A wireframe of a fragment tree: every fragment is a labelled box, containers lay
 * their children out in a row and the top level stacks them.
 * @public
 */
export const CoreLayoutRenderer = (
  props: CoreLayoutRendererProps,
): React.ReactElement => {
  const { className, fragments } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const renderFragment = (
    fragment: CmsFragment,
    isTopLevel: boolean,
  ): React.ReactElement => {
    const { children, typename, uuid } = fragment;

    if (children.length === 0) {
      return (
        <div className="flex-1 border border-dashed p-2" key={uuid}>
          {typename}
        </div>
      );
    }

    return (
      <div className="overflow-auto border p-2" key={uuid}>
        <div className="mb-2">{typename}</div>
        <div className={cn('flex gap-2', isTopLevel && 'flex-col')}>
          {children.map((child) => {
            return renderFragment(child, false);
          })}
        </div>
      </div>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('p-4 text-xs', className)}
      data-testid="CoreLayoutRenderer"
    >
      {fragments.map((fragment) => {
        return renderFragment(fragment, true);
      })}
    </div>
  );
};
