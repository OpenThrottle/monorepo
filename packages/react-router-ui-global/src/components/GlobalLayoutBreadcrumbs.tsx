import * as React from 'react';
import clsx from 'clsx';
import { OpenThrottleBreadcrumbs } from '@openthrottle/react-router-ui';
import type { LinkProps, UIMatch } from 'react-router';
import { useMatches } from 'react-router';
import { hasBreadcrumbHandle } from '../utils/breadcrumb-handle';

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

  // Hooks
  const matches = useMatches();

  // Setup
  const breadcrumbMatches = matches.filter(hasBreadcrumbHandle);
  const breadcrumb = breadcrumbMatches
    .filter((match) => match.handle.breadcrumb)
    .map((match) => match.handle.breadcrumb?.(match))[0];

  const links = breadcrumbMatches
    .filter((match) => match.handle.links)
    .map((match) => match.handle.links?.(match) ?? []);

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
