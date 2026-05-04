import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GetGeneratorByNameDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { GeneratorNxBridge } from '~/routing/generators/components/GeneratorNxBridge';
import type { Route } from '@/app/routes/+types/generators.$generatorId';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (match) => match?.data?.generator?.name ?? 'Generator Details',
  links: (_match) => [{ children: 'Generators', to: '/generators' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const rawName = args.params.generatorId;
  if (rawName == null || rawName === '') {
    throw new Response('Generator name required', { status: 400 });
  }

  const name = decodeURIComponent(rawName);

  const { generator } = await executeGraphqlWithAuth(
    args.request,
    GetGeneratorByNameDocument,
    { name },
  );

  if (generator == null) {
    throw new Response(`Generator "${name}" not found`, { status: 404 });
  }

  return { generator };
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const raw = args.params.generatorId ?? 'Generator';
  const name = decodeURIComponent(raw);

  return [{ title: `${name} | Generators | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { generator } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <h1 className="text-xl my-4 text-highlight">{generator.name}</h1>
      {generator.description !== '' ? (
        <p className="mb-6 max-w-prose text-sm text-muted-foreground">
          {generator.description}
        </p>
      ) : null}

      <GeneratorNxBridge generator={generator} />
    </GlobalScreen>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
