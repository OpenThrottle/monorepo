import * as React from 'react';
import classnames from 'classnames';
import { OpenThrottleBreadcrumbs } from '@openthrottle/react-router-ui';
import { LinkProps, UIMatch, useMatches } from 'react-router';

export interface GlobalLayoutBreadcrumbsHandle<TLoaderData = {}, THandle = {}> {
  breadcrumb?: (match: UIMatch<TLoaderData, THandle>) => React.ReactNode;
  links?: (match: UIMatch<TLoaderData, THandle>) => LinkProps[];
}

export interface GlobalLayoutBreadcrumbsProps {
  className?: string;
}

export const GlobalLayoutBreadcrumbs = (
  props: GlobalLayoutBreadcrumbsProps,
): React.ReactElement => {
  const { className } = props;

  type Matches = UIMatch<string, GlobalLayoutBreadcrumbsHandle>;

  // Hooks
  const matches = useMatches() as Matches[];

  // Setup
  const breadcrumb = matches
    .filter((match) => match.handle && match.handle?.breadcrumb)
    .map((match) => match.handle?.breadcrumb?.(match));

  const links = matches
    .filter((match) => match.handle && match.handle.links)
    .map((match) => match.handle?.links?.(match) ?? []);

  // if (links[0]) {
  //   links[0].unshift({
  //     children: 'OpenThrottle',
  //     className: 'hidden lg:block font-semibold!',
  //     to: '/',
  //   });
  // } else {
  //   links.unshift([
  //     {
  //       children: 'OpenThrottle',
  //       className: 'hidden lg:block font-semibold!',
  //       to: '/',
  //     },
  //   ]);
  // }

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
