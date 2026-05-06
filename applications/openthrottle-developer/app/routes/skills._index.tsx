import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { AgentsSectionQuickLinks } from '~/routing/agents/components/AgentsSectionQuickLinks';
import { AgentsSkillsRegistry } from '~/routing/agents/components/AgentsSkillsRegistry';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { REPO_SKILLS_REGISTRY } from '~/routing/agents/data/repo-skills-registry';
import { SITE_TITLE } from '~/global/config/settings';
import { SkillsIntroduction } from '~/routing/skills/components/SkillsIntroduction';
import type { Route } from '@/app/routes/+types/skills._index';

type LoaderData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<LoaderData> = {
  breadcrumb: (_match) => 'Skills',
  links: (_match) => [],
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
    <GlobalScreen>
      <SkillsIntroduction />
      <AgentsSectionQuickLinks />
      <AgentsSkillsRegistry entries={REPO_SKILLS_REGISTRY} />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
