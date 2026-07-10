import * as React from 'react';
import clsx from 'clsx';
import { OpenThrottleBreadcrumbs } from '@openthrottle/react-router-ui';
import { LinkProps, UIMatch, useMatches } from 'react-router';

export interface GlobalLayoutBreadcrumbsHandle<TLoaderData = {}, THandle = {}> {
  breadcrumb?: (match: UIMatch<TLoaderData, THandle>) => React.ReactNode;
  links?: (match: UIMatch<TLoaderData, THandle>) => LinkProps[];
}

export interface GlobalLayoutBreadcrumbsProps {
  className?: string;
}

type BreadcrumbMatch = UIMatch<string, GlobalLayoutBreadcrumbsHandle>;

/**
 * Narrows a router match to one whose `handle` is a breadcrumb handle object.
 * Route handles are typed `unknown` by `useMatches`, so this guard replaces the
 * former blanket cast — only matches with an object handle flow downstream.
 */
const hasBreadcrumbHandle = (match: UIMatch): match is BreadcrumbMatch =>
  typeof match.handle === 'object' && match.handle !== null;

export const GlobalLayoutBreadcrumbs = (
  props: GlobalLayoutBreadcrumbsProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks
  const matches = useMatches();

  // Setup
  const breadcrumbMatches = matches.filter(hasBreadcrumbHandle);

  const breadcrumb = breadcrumbMatches
    .filter((match) => match.handle.breadcrumb)
    .map((match) => match.handle.breadcrumb?.(match));

  const links = breadcrumbMatches
    .filter((match) => match.handle.links)
    .map((match) => match.handle.links?.(match) ?? []);

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
      className={clsx('ml-4', className)}
      links={links.pop() ?? []}
    />
  );
};
