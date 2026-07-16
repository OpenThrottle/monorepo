import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  ProjectSkillsDocument,
  SkillAvailabilityDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { SkillsIntroduction } from '~/routing/skills/components/SkillsIntroduction';
import { SkillsTable } from '~/routing/skills/components/SkillsTable';
import { SkillsToolbar } from '~/routing/skills/components/SkillsToolbar';
import {
  mergeRepoSkillsWithProjectSkills,
  type ProjectSkillFlagRow,
} from '~/routing/skills/utils/merge-project-skills';
import {
  mergeRepoSkillsWithSkillAvailability,
  type SkillAvailabilityRow,
} from '~/routing/skills/utils/merge-skill-availability';
import type { Route } from '@/app/routes/+types/skills._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Skills',
  links: (_match) => [],
};

/**
 * @description Fetches the `projectSkills` static flag+tags for the merge.
 * Resilient by contract: any failure (DB not migrated/ingested, GraphQL down,
 * auth) yields an empty list so the loader silently falls back to the
 * disk-parsed values. Never throws.
 */
const loadProjectSkillFlags = async (
  request: Request,
): Promise<readonly ProjectSkillFlagRow[]> => {
  try {
    const { projectSkills } = await executeGraphqlWithAuth(
      request,
      ProjectSkillsDocument,
    );
    return projectSkills.skills;
  } catch {
    return [];
  }
};

/**
 * @description Fetches the per-context resolved availability (effective flag +
 * provenance) from the `skillAvailability` surface (`environment: interactive`,
 * the developer-app context). Resolve-time `warnings` are logged server-side
 * and dropped from the UI: there is no plain shadcn `Alert`/callout primitive
 * (only the `AlertDialog` modal), so a dismissable in-page callout is not
 * trivially available — log-and-drop per the design's surfacing guidance.
 * Resilient by contract: any failure yields empty resolved rows so the loader
 * silently falls back to the static-only view. Never throws.
 */
const loadSkillAvailability = async (
  request: Request,
): Promise<readonly SkillAvailabilityRow[]> => {
  try {
    const { skillAvailability } = await executeGraphqlWithAuth(
      request,
      SkillAvailabilityDocument,
      { environment: 'interactive' },
    );

    if (skillAvailability.warnings.length > 0) {
      console.warn(
        `[skills] skillAvailability resolve warnings: ${skillAvailability.warnings.join(', ')}`,
      );
    }

    return skillAvailability.skills;
  } catch {
    return [];
  }
};

export const loader = async (args: Route.LoaderArgs) => {
  console.log('loader');
  const { discoverRepoSkills } =
    await import('~/routing/agents/data/discover-repo-skills.server');
  console.log('discoverRepoSkills ---', discoverRepoSkills);

  const { getMonorepoRoot } =
    await import('~/routing/agents/data/resolve-monorepo-root.server');

  const monorepoRoot = getMonorepoRoot();
  const diskEntries = discoverRepoSkills(monorepoRoot);

  const [projectSkills, availability] = await Promise.all([
    loadProjectSkillFlags(args.request),
    loadSkillAvailability(args.request),
  ]);

  const withStatic = mergeRepoSkillsWithProjectSkills(
    diskEntries,
    projectSkills,
  );

  const entries = mergeRepoSkillsWithSkillAvailability(
    withStatic,
    availability,
  );

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
        <SkillsIntroduction entries={[...entries]} />

        <div className="flex flex-col gap-4">
          <SkillsToolbar />
          <SkillsTable className="bg-card" entries={[...entries]} />
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
