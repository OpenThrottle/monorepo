import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { PREVIEW_COPY } from '../data/data.copy';
import type { CmsFragment } from '../types/cms-fragment';
import type { CmsComponentRegistry } from '../types/cms-render';
import { CoreNullComponent } from './CoreNullComponent';

/**
 * @public
 */
export interface CoreRendererDebugProps {
  readonly className: string | undefined;
  readonly componentRegistry: CmsComponentRegistry;
  /** Overlay every fragment with a link to its editor and outline the selected one. */
  readonly debug: boolean;
  readonly fragments: readonly CmsFragment[];
  readonly getFragmentHref: (fragment: CmsFragment) => string;
  readonly selectedUuid: string | undefined;
}

/**
 * @description The live page with an editing layer: in debug mode each fragment is clickable
 * through to its editor and the selected one is outlined. Deeper fragments sit above their
 * parents, so a nested block stays clickable inside its container.
 * @public
 */
export const CoreRendererDebug = (
  props: CoreRendererDebugProps,
): React.ReactElement => {
  const {
    className,
    componentRegistry,
    debug,
    fragments,
    getFragmentHref,
    selectedUuid,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const renderFragment = (
    fragment: CmsFragment,
    depth: number,
  ): React.ReactElement => {
    const { children, properties, typename, uuid } = fragment;
    const Component = componentRegistry[typename] ?? CoreNullComponent;
    const isSelected = debug && uuid === selectedUuid;
    const overlay = (
      <Link
        aria-label={`${PREVIEW_COPY.editFragment} ${typename}`}
        className="absolute inset-0 cursor-pointer"
        style={{ zIndex: depth + 1 }}
        to={getFragmentHref(fragment)}
      />
    );

    return (
      <div
        className={cn(
          'relative',
          isSelected && 'outline-primary outline-2 outline-dashed',
        )}
        data-selected={isSelected}
        key={uuid}
      >
        <Component properties={properties}>
          {children.map((child) => {
            return renderFragment(child, depth + 1);
          })}
        </Component>
        {debug && overlay}
      </div>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(debug && 'relative', className)}
      data-testid="CoreRendererDebug"
    >
      {fragments.map((fragment) => {
        return renderFragment(fragment, 0);
      })}
    </div>
  );
};
