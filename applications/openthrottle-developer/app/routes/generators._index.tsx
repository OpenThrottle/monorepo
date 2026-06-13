import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BotIcon } from 'lucide-react';
import {
  GENERATOR_DOCS_AGENT_USAGE,
  GENERATOR_DOCS_TOOLS_PACKAGE_README,
} from '~/routing/generators/constants/generator-nx-docs';
import { GeneratorCard } from '~/routing/generators/components/GeneratorCard';
import { GetGeneratorsDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/generators._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
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

export const links: Route.LinksFunction = () => {
  return [];
};

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
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BotIcon}
          title="Generators"
        />
        <p className="text-muted-foreground text-sm">
          Nx commands run in your monorepo clone (see{' '}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={GENERATOR_DOCS_AGENT_USAGE}
            rel="noreferrer"
            target="_blank"
          >
            AGENT_USAGE
          </a>{' '}
          and the{' '}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={GENERATOR_DOCS_TOOLS_PACKAGE_README}
            rel="noreferrer"
            target="_blank"
          >
            @tools/generators README
          </a>
          ). Open a card for doc links, command presets, and support-bundle CLI
          capture.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {generators.map((generator) => (
          <GeneratorCard generator={generator} key={generator.name} />
        ))}
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
