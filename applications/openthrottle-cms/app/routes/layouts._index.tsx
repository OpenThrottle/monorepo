import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/layouts._index';
import { CmsLayoutsDocument } from '~/__generated__/graphql';
import { GlobalTable } from '~/global/components/GlobalTable';
import { SITE_TITLE } from '~/global/config/settings';
import { CMS_LAYOUT_COLUMNS } from '~/global/data/cms-table-columns';
import { fetchAuthGraphql } from '~/global/utils/graphql.server';
import { getLayoutRowHref } from '~/routing/layouts/utils/layout-rows';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Layouts',
  links: (_match) => [],
};

/**
 * @description Lists layouts as the signed-in user: an editor (`cms:write`) sees every status,
 * anyone else only ACTIVE layouts.
 */
export const loader = async (args: Route.LoaderArgs) => {
  const { cmsLayouts } = await fetchAuthGraphql(
    args.request,
    CmsLayoutsDocument,
  );

  return { cmsLayouts };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Layouts | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BookOpenIcon}
          title="Layouts"
        />
        <p className="text-muted-foreground text-sm">
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Facilis,
          architecto ea?
        </p>

        <GlobalTable
          className="mt-6"
          columns={CMS_LAYOUT_COLUMNS}
          emptyState="No layouts yet."
          getRowHref={getLayoutRowHref}
          getRowId={(row) => row.uuid}
          rows={loaderData.cmsLayouts.items}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
