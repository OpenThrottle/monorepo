import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { BrainCircuitIcon } from 'lucide-react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { AgentsSectionQuickLinks } from '~/routing/agents/components/AgentsSectionQuickLinks';
import { AgentsSkillsRegistry } from '~/routing/agents/components/AgentsSkillsRegistry';
import { REPO_SKILLS_REGISTRY } from '~/routing/agents/data/repo-skills-registry';
import type { Route } from '@/app/routes/+types/skills._index';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Skills',
  links: (_match) => [],
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Skills | ${SITE_TITLE}` }];
});

export default function Component(
  _props: Route.ComponentProps,
): React.ReactElement {
  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h3"
          icon={BrainCircuitIcon}
          title="Skills"
        />
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Static registry of <code className="text-xs">SKILL.md</code> paths in
          this monorepo—compare with disk and Cursor routing when debugging
          skill picks.
        </p>
      </div>

      <AgentsSectionQuickLinks />

      <AgentsSkillsRegistry entries={REPO_SKILLS_REGISTRY} />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
