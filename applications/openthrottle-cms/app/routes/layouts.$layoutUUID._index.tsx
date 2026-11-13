import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/layouts.$layoutUUID._index';
import { CmsLayoutDetailDocument } from '~/__generated__/graphql';
import { GlobalDetailList } from '~/global/components/GlobalDetailList';
import { GlobalTable } from '~/global/components/GlobalTable';
import { SITE_TITLE } from '~/global/config/settings';
import { CMS_LAYOUT_DETAIL_FIELDS } from '~/global/data/data.cms-detail-fields';
import { CMS_LAYOUT_FRAGMENT_COLUMNS } from '~/global/data/data.cms-table-columns';
import { fetchPublicGraphql } from '~/global/utils/graphql.server';
import { requireRecord } from '~/global/utils/requireRecord';
import { LAYOUT_DETAIL_COPY } from '~/routing/layouts/data/data.copy';
import {
  getLayoutFragmentRowHref,
  getLayoutFragmentRowId,
} from '~/routing/layouts/utils/layout-rows';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => {
    return match.loaderData?.cmsLayout.name ?? LAYOUT_DETAIL_COPY.fallbackName;
  },
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const result = await fetchPublicGraphql(CmsLayoutDetailDocument, {
    uuid: args.params.layoutUUID,
  });
  const cmsLayout = requireRecord(result.cmsLayoutByUuid, 'Layout');

  return { cmsLayout };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (args: Route.MetaArgs) => {
  const name =
    args.loaderData?.cmsLayout.name ?? LAYOUT_DETAIL_COPY.fallbackName;

  return [{ title: `${name} | Layouts | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { cmsLayout } = loaderData;

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
          title={cmsLayout.name}
        />
        <GlobalDetailList
          className={undefined}
          fields={CMS_LAYOUT_DETAIL_FIELDS}
          record={cmsLayout}
        />

        <GlobalHeading
          className="mt-8 mb-4"
          heading="h2"
          icon={BookOpenIcon}
          title={LAYOUT_DETAIL_COPY.fragmentsHeading}
        />
        <GlobalTable
          className={undefined}
          columns={CMS_LAYOUT_FRAGMENT_COLUMNS}
          emptyState={LAYOUT_DETAIL_COPY.fragmentsEmpty}
          getRowHref={getLayoutFragmentRowHref}
          getRowId={getLayoutFragmentRowId}
          rows={cmsLayout.fragments}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
