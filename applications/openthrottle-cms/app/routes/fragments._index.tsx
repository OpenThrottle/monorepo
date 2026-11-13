import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/fragments._index';
import { CmsFragmentsDocument } from '~/__generated__/graphql';
import { GlobalTable } from '~/global/components/GlobalTable';
import { SITE_TITLE } from '~/global/config/settings';
import { CMS_FRAGMENT_COLUMNS } from '~/global/data/data.cms-table-columns';
import { fetchPublicGraphql } from '~/global/utils/graphql.server';
import { getFragmentRowHref } from '~/routing/fragments/utils/getFragmentRowHref';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Fragments',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  const { cmsFragments } = await fetchPublicGraphql(CmsFragmentsDocument);

  return { cmsFragments };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Fragments | ${SITE_TITLE}` }];
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
          title="Fragments"
        />
        <p className="text-muted-foreground text-sm">
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Facilis,
          architecto ea?
        </p>

        <GlobalTable
          className="mt-6"
          columns={CMS_FRAGMENT_COLUMNS}
          emptyState="No fragments yet."
          getRowHref={getFragmentRowHref}
          getRowId={(row) => row.uuid}
          rows={loaderData.cmsFragments.items}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
