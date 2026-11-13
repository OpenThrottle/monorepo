import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/fragments.$uuid';
import { CmsFragmentDetailDocument } from '~/__generated__/graphql';
import { GlobalDetailList } from '~/global/components/GlobalDetailList';
import { SITE_TITLE } from '~/global/config/settings';
import { CMS_FRAGMENT_DETAIL_FIELDS } from '~/global/data/data.cms-detail-fields';
import { formatJson } from '~/global/utils/formatJson';
import { fetchPublicGraphql } from '~/global/utils/graphql.server';
import { requireRecord } from '~/global/utils/requireRecord';
import { FRAGMENT_DETAIL_COPY } from '~/routing/fragments/data/data.copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => {
    return (
      match.loaderData?.cmsFragment.name ?? FRAGMENT_DETAIL_COPY.fallbackName
    );
  },
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const result = await fetchPublicGraphql(CmsFragmentDetailDocument, {
    uuid: args.params.uuid,
  });
  const cmsFragment = requireRecord(result.cmsFragment, 'Fragment');

  return { cmsFragment };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (args: Route.MetaArgs) => {
  const name =
    args.loaderData?.cmsFragment.name ?? FRAGMENT_DETAIL_COPY.fallbackName;

  return [{ title: `${name} | Fragments | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { cmsFragment } = loaderData;

  // Hooks

  // Setup
  const propertiesText = formatJson(cmsFragment.propertiesJson);

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
          title={cmsFragment.name}
        />
        <GlobalDetailList
          className={undefined}
          fields={CMS_FRAGMENT_DETAIL_FIELDS}
          record={cmsFragment}
        />

        <GlobalHeading
          className="mt-8 mb-4"
          heading="h2"
          icon={BookOpenIcon}
          title={FRAGMENT_DETAIL_COPY.dataHeading}
        />
        <pre className="bg-muted overflow-x-auto rounded-md p-4 text-xs">
          <code>{propertiesText}</code>
        </pre>
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
