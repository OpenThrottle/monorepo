import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { REPO_SKILLS_REGISTRY } from '~/routing/agents/data/repo-skills-registry';
import { SITE_TITLE } from '~/global/config/settings';
import { SkillsIntroduction } from '~/routing/skills/components/SkillsIntroduction';
import { SkillsOverviewModal } from '~/routing/skills/components/SkillsOverviewModal';
import { SkillsTable } from '~/routing/skills/components/SkillsTable';
import { SkillsToolbar } from '~/routing/skills/components/SkillsToolbar';
import type { Route } from '@/app/routes/+types/skills._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Skills',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Skills | ${SITE_TITLE}` }];
});

export default function Component(
  _props: Route.ComponentProps,
): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <GlobalScreen>
        <SkillsIntroduction entries={REPO_SKILLS_REGISTRY} />
        <SkillsToolbar />
        <SkillsTable entries={REPO_SKILLS_REGISTRY} />

        {/* <AgentsSectionQuickLinks /> */}
        {/* <SkillsList entries={REPO_SKILLS_REGISTRY} /> */}
        {/* <AgentsSkillsRegistry entries={REPO_SKILLS_REGISTRY} /> */}
      </GlobalScreen>

      <SkillsOverviewModal />
    </>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
