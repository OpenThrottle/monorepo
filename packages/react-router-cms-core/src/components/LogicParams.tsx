import type { CmsComponentDebug } from '@openthrottle/react-router-cms-ui';
import * as React from 'react';
import { useSearchParams } from 'react-router';

/**
 * @description Renders its first child when a URL search param has the expected value, and its
 * second child (if any) otherwise.
 * @public
 */
export interface LogicParamsProps {
  /**
   * @description The match, then an optional fallback.
   * @maxItems 2
   * @cmsWidget children
   */
  readonly children: React.ReactNode;

  /**
   * @description The URL parameter to check against (case sensitive).
   */
  readonly param: string;

  /**
   * @description The expected value of the URL parameter (case sensitive).
   */
  readonly value: string;
}

/**
 * @public
 */
export const LogicParams = (props: LogicParamsProps): React.ReactElement => {
  const { children, param, value } = props;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const [match = null, fallback = null] = React.Children.toArray(children);
  const isParamMatch = searchParams.get(param) === value;
  const content = isParamMatch ? match : fallback;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <>{content}</>;
};

LogicParams.debug = {
  className: 'border-green-500',
} satisfies CmsComponentDebug;
