/**
 * @description Test harness for the evals components: renders an element
 * inside a {@link createRoutesStub} (for `Link`, `useParams` and fetchers) and
 * a `TooltipProvider` (for `PlanRunTime`). Pass `action` to stand in for the
 * trajectory viewer route's action; `path` and `initialEntry` let a spec give
 * the element route params.
 */
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render, type RenderResult } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';

export interface RenderEvalsOptions {
  readonly action:
    ((args: { readonly request: Request }) => unknown) | undefined;
  readonly initialEntry: string | undefined;
  readonly path: string | undefined;
}

const NO_OPTIONS: RenderEvalsOptions = {
  action: undefined,
  initialEntry: undefined,
  path: undefined,
};

export const renderEvals = (
  element: React.ReactElement,
  options: RenderEvalsOptions = NO_OPTIONS,
): RenderResult => {
  const Component = (): React.ReactElement => {
    return <TooltipProvider delayDuration={0}>{element}</TooltipProvider>;
  };
  const path = options.path ?? '/';
  const RoutesStub = createRoutesStub([
    { Component, action: options.action, path },
  ]);

  return render(<RoutesStub initialEntries={[options.initialEntry ?? path]} />);
};
