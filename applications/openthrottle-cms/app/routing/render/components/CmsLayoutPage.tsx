import type { CmsFragment } from '@openthrottle/react-router-cms-core';
import {
  CORE_COMPONENTS,
  CoreRenderer,
} from '@openthrottle/react-router-cms-core';
import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface CmsLayoutPageProps {
  readonly className: string | undefined;
  readonly fragments: readonly CmsFragment[];
}

/**
 * @description A cms layout rendered as the live page: every fragment mounts the core or
 * `react-router-cms-ui` block its `typename` names, and an unknown typename renders nothing.
 */
export const CmsLayoutPage = (
  props: CmsLayoutPageProps,
): React.ReactElement => {
  const { className, fragments } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn(className)} data-testid="CmsLayoutPage">
      <pre>{JSON.stringify(fragments, null, 2)}</pre>
      <CoreRenderer
        className={undefined}
        componentRegistry={CORE_COMPONENTS}
        fragments={fragments}
      />
    </div>
  );
};
