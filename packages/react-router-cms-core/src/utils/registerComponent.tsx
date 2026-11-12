import * as React from 'react';

import type {
  CmsRegisteredComponent,
  CmsRenderProps,
} from '../types/cms-render';

/**
 * @description Adapts a component with typed props into one the renderer can mount: `toProps`
 * narrows the stored properties (and places the rendered children) into the props it needs.
 * @public
 */
export const registerComponent = <TProps extends object>(
  Component: React.ComponentType<TProps>,
  toProps: (render: CmsRenderProps) => TProps,
): CmsRegisteredComponent => {
  const Registered = (render: CmsRenderProps): React.ReactElement => {
    return <Component {...toProps(render)} />;
  };

  Registered.displayName = `Registered(${Component.displayName ?? Component.name})`;

  return Registered;
};
