import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/libraries.$libraryUUID._index';
import { CmsLibraryDetailDocument } from '~/__generated__/graphql';
import { GlobalDetailList } from '~/global/components/GlobalDetailList';
import { GlobalTable } from '~/global/components/GlobalTable';
import { SITE_TITLE } from '~/global/config/settings';
import { CMS_LIBRARY_DETAIL_FIELDS } from '~/global/data/data.cms-detail-fields';
import { CMS_LIBRARY_COMPONENT_COLUMNS } from '~/global/data/data.cms-table-columns';
import { fetchPublicGraphql } from '~/global/utils/graphql.server';
import { requireRecord } from '~/global/utils/requireRecord';
import { getComponentRowHref } from '~/routing/components/utils/getComponentRowHref';
import { LIBRARY_DETAIL_COPY } from '~/routing/libraries/data/data.copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => {
    const cmsLibrary = match.loaderData?.cmsLibrary;

    if (!cmsLibrary) {
      return LIBRARY_DETAIL_COPY.fallbackLabel;
    }

    return cmsLibrary.name;
  },
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const result = await fetchPublicGraphql(CmsLibraryDetailDocument, {
    uuid: args.params.libraryUUID,
  });
  const cmsLibrary = requireRecord(result.cmsLibrary, 'Library');

  return { cmsLibrary };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (args: Route.MetaArgs) => {
  const label =
    args.loaderData?.cmsLibrary.name ?? LIBRARY_DETAIL_COPY.fallbackLabel;

  return [{ title: `${label} | Libraries | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { cmsLibrary } = loaderData;

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
          title={cmsLibrary.name}
        />
        <GlobalDetailList
          className={undefined}
          fields={CMS_LIBRARY_DETAIL_FIELDS}
          record={cmsLibrary}
        />

        <GlobalHeading
          className="mt-8 mb-4"
          heading="h2"
          icon={BookOpenIcon}
          title={LIBRARY_DETAIL_COPY.componentsHeading}
        />
        <GlobalTable
          className={undefined}
          columns={CMS_LIBRARY_COMPONENT_COLUMNS}
          emptyState={LIBRARY_DETAIL_COPY.componentsEmptyState}
          getRowHref={getComponentRowHref}
          getRowId={(row) => row.uuid}
          rows={cmsLibrary.components}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
