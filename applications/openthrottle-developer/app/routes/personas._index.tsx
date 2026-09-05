import * as React from 'react';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { PersonasStats } from '~/routing/personas/components/PersonasStats';
import { PersonasToolbar } from '~/routing/personas/components/PersonasToolbar';
import { PersonasTable } from '~/routing/personas/components/PersonasTable';
import { PersonasIntroduction } from '~/routing/personas/components/PersonasIntroduction';
import type { Route } from '@/app/routes/+types/personas._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Personas',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  const { discoverRepoPersonas } =
    await import('~/routing/agents/data/discover-repo-personas.server');
  const { getMonorepoRoot } =
    await import('~/routing/agents/data/resolve-monorepo-root.server');

  const monorepoRoot = getMonorepoRoot();
  const entries = discoverRepoPersonas(monorepoRoot);

  return { entries };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Personas | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  const entries = [...props.loaderData.entries];

  return (
    <GlobalScreen beta={true}>
      <PersonasIntroduction entries={entries} />
      <PersonasStats entries={entries} />
      <PersonasToolbar />
      <PersonasTable className="bg-card" entries={entries} />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
