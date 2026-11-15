import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { Route } from '@/app/routes/+types/components.$uuid';
import { CmsComponentDetailDocument } from '~/__generated__/graphql';
import { GlobalDetailList } from '~/global/components/GlobalDetailList';
import { SITE_TITLE } from '~/global/config/settings';
import { CMS_COMPONENT_DETAIL_FIELDS } from '~/global/data/data.cms-detail-fields';
import { getLibraryHref } from '~/global/utils/getLibraryHref';
import { fetchPublicGraphql } from '~/global/utils/graphql.server';
import { requireRecord } from '~/global/utils/requireRecord';
import { ComponentEditor } from '~/routing/components/components/ComponentEditor';
import {
  COMPONENT_DETAIL_COPY,
  COMPONENT_EDITOR_COPY,
} from '~/routing/components/data/data.copy';
import type { ComponentActionResult } from '~/routing/components/types/component-action';
import { runComponentAction } from '~/routing/components/utils/runComponentAction.server';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => {
    const cmsComponent = match.loaderData?.cmsComponent;

    if (!cmsComponent) {
      return COMPONENT_DETAIL_COPY.fallbackLabel;
    }

    return cmsComponent.name;
  },
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const result = await fetchPublicGraphql(CmsComponentDetailDocument, {
    uuid: args.params.uuid,
  });
  const cmsComponent = requireRecord(result.cmsLibraryComponent, 'Component');

  return { cmsComponent };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (args: Route.MetaArgs) => {
  const label =
    args.loaderData?.cmsComponent.name ?? COMPONENT_DETAIL_COPY.fallbackLabel;

  return [{ title: `${label} | Components | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { cmsComponent } = loaderData;

  // Hooks

  // Setup
  const libraryHref = getLibraryHref(cmsComponent.libraryUuid);

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
          title={cmsComponent.name}
        />
        <GlobalDetailList
          className={undefined}
          fields={CMS_COMPONENT_DETAIL_FIELDS}
          record={cmsComponent}
        />

        <GlobalHeading
          className="mt-8 mb-4"
          heading="h2"
          icon={BookOpenIcon}
          title={COMPONENT_DETAIL_COPY.libraryHeading}
        />
        <Link className="text-sm underline" to={libraryHref}>
          {cmsComponent.libraryUuid}
        </Link>

        <GlobalHeading
          className="mt-8 mb-4"
          heading="h2"
          icon={BookOpenIcon}
          title={COMPONENT_EDITOR_COPY.heading}
        />
        <ComponentEditor
          className={undefined}
          component={cmsComponent}
          key={cmsComponent.uuid}
          result={actionData}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (
  args: Route.ActionArgs,
): Promise<ComponentActionResult> => {
  return runComponentAction(args.request, args.params.uuid);
};

export const ErrorBoundary = GlobalErrorBoundary;
