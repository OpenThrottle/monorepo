import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { CmsFragment } from '../types/cms-fragment';

/**
 * @public
 */
export interface CoreFragmentRendererProps {
  readonly className: string | undefined;
  readonly fragments: readonly CmsFragment[];
  /** Where a leaf fragment links to — the app's fragment editor route. */
  readonly getFragmentHref: (fragment: CmsFragment) => string;
}

/**
 * @description An indented outline of a fragment tree; each leaf links to its editor.
 * @public
 */
export const CoreFragmentRenderer = (
  props: CoreFragmentRendererProps,
): React.ReactElement => {
  const { className, fragments, getFragmentHref } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const renderFragment = (
    fragment: CmsFragment,
    depth: number,
  ): React.ReactElement => {
    const { children, typename, uuid } = fragment;

    if (children.length === 0) {
      return (
        <Link
          className="hover:bg-muted block border-l border-dashed p-2"
          key={uuid}
          style={{ paddingLeft: depth * 10 }}
          to={getFragmentHref(fragment)}
        >
          {typename}
        </Link>
      );
    }

    return (
      <div className="border-l border-dashed p-2" key={uuid}>
        {typename}
        {children.map((child) => {
          return renderFragment(child, depth + 1);
        })}
      </div>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <nav
      className={cn('p-4 text-xs', className)}
      data-testid="CoreFragmentRenderer"
    >
      {fragments.map((fragment) => {
        return renderFragment(fragment, 0);
      })}
    </nav>
  );
};
