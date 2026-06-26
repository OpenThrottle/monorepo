import * as React from 'react';
import {
  DEMO_LAYOUT,
  FloorLayoutEditor,
} from '@openthrottle/react-router-floor-layout';
import {
  GlobalErrorBoundary,
  type GlobalLayoutBreadcrumbsHandle,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { canonicalMeta } from '~/global/utils/canonical';
import type { Route } from '@/app/routes/+types/demos.layout._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'DemosLayoutIndex',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (args: Route.MetaArgs) => {
  return [
    { title: `Floor layout demo | ${SITE_TITLE}` },

    // Per-route canonical URL so duplicate-content signals stay correct.
    canonicalMeta(args.location.pathname),
  ];
};

/**
 * Public demo of `FloorLayoutEditor` (live drag, pan/zoom, undo/redo). Doubles
 * as the source-first integration check for the floor-layout package.
 */
export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="mx-auto flex max-w-7xl flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Floor layout</h1>
        <p className="text-muted-foreground text-sm">
          Drag tables, stools, zones, and walls. Pinch or scroll to zoom, drag
          empty space to pan, and use undo/redo.
        </p>
      </div>
      <FloorLayoutEditor defaultValue={DEMO_LAYOUT} />
    </main>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
