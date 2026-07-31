import type { UIMatch } from 'react-router';
import type { GlobalLayoutBreadcrumbsHandle } from '../components/GlobalLayoutBreadcrumbs';

/** A router match whose `handle` is a {@link GlobalLayoutBreadcrumbsHandle}. */
export type BreadcrumbMatch = UIMatch<string, GlobalLayoutBreadcrumbsHandle>;

/**
 * Narrows a router match to one whose `handle` is a breadcrumb handle object.
 * Route handles are typed `unknown` by `useMatches`, so this guard replaces the
 * former blanket cast — only matches with an object handle flow downstream.
 */
export const hasBreadcrumbHandle = (match: UIMatch): match is BreadcrumbMatch =>
  typeof match.handle === 'object' && match.handle !== null;
