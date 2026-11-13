import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/schemas.$uuid._index';
import { CmsSchemaDetailDocument } from '~/__generated__/graphql';
import { GlobalDetailList } from '~/global/components/GlobalDetailList';
import { SITE_TITLE } from '~/global/config/settings';
import { CMS_SCHEMA_DETAIL_FIELDS } from '~/global/data/data.cms-detail-fields';
import { formatJson } from '~/global/utils/formatJson';
import { fetchPublicGraphql } from '~/global/utils/graphql.server';
import { requireRecord } from '~/global/utils/requireRecord';
import { SCHEMA_DETAIL_COPY } from '~/routing/schemas/data/data.copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => {
    const cmsSchema = match.loaderData?.cmsSchema;

    if (!cmsSchema) {
      return SCHEMA_DETAIL_COPY.fallbackLabel;
    }

    return `${cmsSchema.typename} v${cmsSchema.version}`;
  },
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const result = await fetchPublicGraphql(CmsSchemaDetailDocument, {
    uuid: args.params.uuid,
  });
  const cmsSchema = requireRecord(result.cmsSchema, 'Schema');

  return { cmsSchema };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (args: Route.MetaArgs) => {
  const cmsSchema = args.loaderData?.cmsSchema;
  const label = cmsSchema
    ? `${cmsSchema.typename} v${cmsSchema.version}`
    : SCHEMA_DETAIL_COPY.fallbackLabel;

  return [{ title: `${label} | Schemas | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { cmsSchema } = loaderData;

  // Hooks

  // Setup
  const label = `${cmsSchema.typename} v${cmsSchema.version}`;
  const definitionText = formatJson(cmsSchema.jsonSchemaJson);

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
          title={label}
        />
        <GlobalDetailList
          className={undefined}
          fields={CMS_SCHEMA_DETAIL_FIELDS}
          record={cmsSchema}
        />

        <GlobalHeading
          className="mt-8 mb-4"
          heading="h2"
          icon={BookOpenIcon}
          title={SCHEMA_DETAIL_COPY.definitionHeading}
        />
        <pre className="bg-muted overflow-x-auto rounded-md p-4 text-xs">
          <code>{definitionText}</code>
        </pre>
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
