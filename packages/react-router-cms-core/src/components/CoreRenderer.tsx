import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { CmsFragment } from '../types/cms-fragment';
import type { CmsComponentRegistry } from '../types/cms-render';
import { CoreNullComponent } from './CoreNullComponent';

/**
 * @public
 */
export interface CoreRendererProps {
  readonly className: string | undefined;
  /** `CORE_COMPONENTS`, or a registry from `createComponentRegistry`. */
  readonly componentRegistry: CmsComponentRegistry;
  readonly fragments: readonly CmsFragment[];
}

/**
 * @description Renders a fragment tree as the live page: each fragment mounts the component its
 * `typename` names in the registry, with its rendered children inside it.
 * @public
 */
export const CoreRenderer = (props: CoreRendererProps): React.ReactElement => {
  const { className, componentRegistry, fragments } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const renderFragment = (fragment: CmsFragment): React.ReactElement => {
    const { children, properties, typename, uuid } = fragment;
    const Component = componentRegistry[typename] ?? CoreNullComponent;

    return (
      <Component key={uuid} properties={properties}>
        {children.map(renderFragment)}
      </Component>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn(className)} data-testid="CoreRenderer">
      {fragments.map(renderFragment)}
    </div>
  );
};
