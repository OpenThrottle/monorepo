import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GetGeneratorsDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { GeneratorCard } from '~/routing/generators/components/GeneratorCard';
import { GENERATOR_DOCS_AGENT_USAGE } from '~/routing/generators/constants/generator-nx-docs';
import type { Route } from '@/app/routes/+types/generators._index';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Generators',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { generators } = await executeGraphqlWithAuth(
    args.request,
    GetGeneratorsDocument,
  );

  return { generators };
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Generators | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const { generators } = loaderData;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <h1 className="text-xl my-4 text-highlight">Generators</h1>
      <p className="mb-6 max-w-prose text-sm text-muted-foreground">
        Nx commands run in your monorepo clone (see{' '}
        <a
          className="text-primary underline-offset-4 hover:underline"
          href={GENERATOR_DOCS_AGENT_USAGE}
          rel="noreferrer"
          target="_blank"
        >
          AGENT_USAGE
        </a>
        ). Open a card for doc links, command presets, and support-bundle CLI
        capture.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
        {generators.map((generator) => (
          <GeneratorCard generator={generator} key={generator.name} />
        ))}
      </div>
    </GlobalScreen>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
