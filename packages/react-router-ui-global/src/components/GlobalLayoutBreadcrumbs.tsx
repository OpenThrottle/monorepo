import * as React from 'react';
import classnames from 'classnames';
import { OpenThrottleBreadcrumbs } from '@openthrottle/react-router-ui';
import { LinkProps, UIMatch, useMatches } from 'react-router';

export interface GlobalLayoutBreadcrumbsHandle {
  breadcrumb?: (match: UIMatch<string, any>) => React.ReactNode;
  links?: (match: UIMatch<string, any>) => LinkProps[];
}

export interface GlobalLayoutBreadcrumbsProps {
  className?: string;
}

export const GlobalLayoutBreadcrumbs = (
  props: GlobalLayoutBreadcrumbsProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  const matches = useMatches() as UIMatch<
    string,
    GlobalLayoutBreadcrumbsHandle
  >[];

  // Setup
  const breadcrumb = matches
    .filter((match) => match.handle && match.handle?.breadcrumb)
    .map((match) => match.handle?.breadcrumb?.(match));

  const links = matches
    .filter((match) => match.handle && match.handle.links)
    .map((match) => match.handle?.links?.(match) ?? []);

  if (links[0]) {
    links[0].unshift({ children: 'OpenThrottle', to: '/' });
  } else {
    links.unshift([{ children: 'OpenThrottle', to: '/' }]);
  }

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleBreadcrumbs
      children={breadcrumb}
      className={classnames('ml-4', className)}
      links={links.pop() ?? []}
    />
  );
};
