import * as React from 'react';
import { useSearchParams } from 'react-router';

/**
 * @description Test-only probe that renders the router's current search string.
 *
 * URL-driven controls read their selected value from loader data, so in a
 * `createRoutesStub` render a click cannot flip the control's own state — what
 * it actually does is rewrite the search params. Rendering this alongside the
 * control makes that effect assertable.
 */
export const SearchParamsProbe = (): React.ReactElement => {
  const [searchParams] = useSearchParams();

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <span data-testid="search">{searchParams.toString()}</span>;
};
