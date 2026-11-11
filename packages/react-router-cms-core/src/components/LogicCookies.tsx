import type { CmsComponentDebug } from '@openthrottle/react-router-cms-ui';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { LOGIC_COOKIES_COPY } from '../data/data.copy';

/**
 * @description Hooks into the available cookies so a layout can make decisions based on them.
 * Upstream never got past rendering its children, which is all this does too.
 * @public
 */
export interface LogicCookiesProps {
  /**
   * @description The child components to be rendered via this Logic component.
   * @TJS-type children
   */
  readonly children: React.ReactNode;

  /**
   * @default "{}"
   * @description The cookies to match against, by name.
   * @TJS-type object
   */
  readonly cookies: Readonly<Record<string, string>>;
}

/**
 * @public
 */
export const LogicCookies = (props: LogicCookiesProps): React.ReactElement => {
  const { children } = props;

  // Hooks

  // Setup
  const hasChildren = React.Children.count(children) > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (hasChildren) return <div data-testid="LogicCookies">{children}</div>;

  return (
    <Empty data-testid="LogicCookies">
      <EmptyHeader>
        <EmptyTitle>{LOGIC_COOKIES_COPY.emptyTitle}</EmptyTitle>
        <EmptyDescription>
          {LOGIC_COOKIES_COPY.emptyDescription}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
};

LogicCookies.debug = {
  className: 'border-green-500',
} satisfies CmsComponentDebug;
