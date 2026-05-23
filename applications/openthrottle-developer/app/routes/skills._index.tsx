import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { SkillsIntroduction } from '~/routing/skills/components/SkillsIntroduction';
import { SkillsTable } from '~/routing/skills/components/SkillsTable';
import { SkillsToolbar } from '~/routing/skills/components/SkillsToolbar';
import type { Route } from '@/app/routes/+types/skills._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Skills',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  const { discoverRepoSkills } =
    await import('~/routing/agents/data/discover-repo-skills.server');
  const { getMonorepoRoot } =
    await import('~/routing/agents/data/resolve-monorepo-root.server');
  const monorepoRoot = getMonorepoRoot();
  const entries = discoverRepoSkills(monorepoRoot);

  return { entries };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Skills | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { entries } = props.loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <GlobalScreen>
        <SkillsIntroduction entries={entries} />

        <div className="flex flex-col gap-4">
          <SkillsToolbar />
          <SkillsTable entries={entries} />
          {/* <SkillsTable entries={[]} /> */}
        </div>

        {/* <AgentsSectionQuickLinks /> */}
        {/* <SkillsList entries={entries} /> */}
        {/* <AgentsSkillsRegistry entries={entries} /> */}
      </GlobalScreen>
    </>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
