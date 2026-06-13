import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BotIcon, BadgeCheckIcon, BookIcon, ListIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@openthrottle/react-router-shadcn';
import { GeneratorNxBridge } from '~/routing/generators/components/GeneratorNxBridge';
import { GeneratorTabDebug } from '~/routing/generators/components/GeneratorTabDebug';
import { GeneratorTabDocumentation } from '~/routing/generators/components/GeneratorTabDocumentation';
import { GeneratorTabPresets } from '~/routing/generators/components/GeneratorTabPresets';
import { GetGeneratorByNameDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/generators.$generatorId';
import { PuzzlePieceIcon } from '@phosphor-icons/react/dist/ssr/PuzzlePiece';
import { GeneratorTabSchema } from '~/routing/generators/components/GeneratorTabSchema';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) =>
    match.loaderData?.generator?.name ?? 'Generator Details',
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

export const links: Route.LinksFunction = () => {
  return [];
};

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
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BotIcon}
          title={generator.name}
        />

        {generator.description !== '' ? (
          <p className="text-muted-foreground text-sm">
            {generator.description}
          </p>
        ) : null}
      </div>

      <Tabs className="w-full" defaultValue="documentation">
        <TabsList className="mb-8 w-full justify-start gap-4" variant="line">
          <TabsTrigger className="flex-0 cursor-pointer" value="documentation">
            <BookIcon />
            Documentation
          </TabsTrigger>
          <TabsTrigger className="flex-0 cursor-pointer" value="presets">
            <ListIcon />
            Presets
          </TabsTrigger>
          <TabsTrigger className="flex-0 cursor-pointer" value="schema">
            <PuzzlePieceIcon />
            Schema
          </TabsTrigger>
          <TabsTrigger className="flex-0 cursor-pointer" value="debug">
            <BadgeCheckIcon />
            Debug
          </TabsTrigger>
        </TabsList>

        <GeneratorTabDocumentation />
        <GeneratorTabPresets generator={generator} />
        <GeneratorTabSchema generator={generator} />
        <GeneratorTabDebug generator={generator} />
      </Tabs>

      <GeneratorNxBridge generator={generator} />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
