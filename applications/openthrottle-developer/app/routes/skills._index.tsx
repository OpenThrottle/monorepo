import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalFeatureOnboardingModal,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { Await } from 'react-router';

import type { Route } from '@/app/routes/+types/skills._index';
import { SITE_TITLE } from '~/global/config/settings';
import { runSkillRecordTagAction } from '~/routing/skills/actions/project-skill-tags';
import { SkillsIndexContent } from '~/routing/skills/components/SkillsIndexContent';
import { SkillsIndexUsage } from '~/routing/skills/components/SkillsIndexUsage';
import { SkillsIntroduction } from '~/routing/skills/components/SkillsIntroduction';
import { SKILL_USAGE_RANGE_DAYS } from '~/routing/skills/config/skill-usage';
import { SKILLS_ONBOARDING } from '~/routing/skills/data/data.copy';
import { mergeRepoSkillsWithProjectSkills } from '~/routing/skills/utils/mergeRepoSkillsWithProjectSkills';
import { mergeRepoSkillsWithSkillAvailability } from '~/routing/skills/utils/mergeRepoSkillsWithSkillAvailability';
import {
  loadProjectSkillFlags,
  loadSkillAvailability,
  loadSkillTagVocabulary,
} from '~/routing/skills/utils/skill-index-loaders';
import { loadSkillsIndexUsage } from '~/routing/skills/utils/skill-usage-loaders';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Skills',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { discoverRepoSkills } =
    await import('~/routing/agents/utils/discoverRepoSkills.server');

  const { getMonorepoRoot } =
    await import('~/routing/agents/utils/resolve-monorepo-root.server');

  const monorepoRoot = getMonorepoRoot();
  const diskEntries = discoverRepoSkills(monorepoRoot);

  const [projectSkills, availability, tagVocabulary] = await Promise.all([
    loadProjectSkillFlags(args.request),
    loadSkillAvailability(args.request),
    loadSkillTagVocabulary(args.request),
  ]);

  const withStatic = mergeRepoSkillsWithProjectSkills(
    diskEntries,
    projectSkills,
  );

  const entries = mergeRepoSkillsWithSkillAvailability(
    withStatic,
    availability,
  );

  // Slugs actually present in this checkout. Leaderboard rows are classified
  // against this set: it decides both which rows link through to a detail page
  // and which ones are only history. Reuse the same disk gate `/skills/$slug`
  // uses to 404, so neither depends on DB ingest/auth state (mirrors /usage).
  const presentSlugs = diskEntries.map((entry) => entry.slug);

  // Deferred aggregate usage over a fixed 30-day window, streamed as a naked
  // promise (RR8 Single Fetch) so the skills list + table paint immediately.
  // Failures resolve to the unavailable sentinel inside the loader helper.
  const usage = loadSkillsIndexUsage(args.request);

  return { entries, presentSlugs, tagVocabulary, usage };
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
  const { entries, presentSlugs, tagVocabulary, usage } = props.loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <GlobalScreen>
        <SkillsIntroduction />

        <SkillsIndexContent entries={entries} tagVocabulary={tagVocabulary} />

        {/* Deferred aggregate usage: RR8 streams the loader promise so the
            skills list above paints first and the chart + leaderboard hydrate
            in. The loader already caught failures into the unavailable
            sentinel, so no errorElement is needed here. */}
        <React.Suspense
          fallback={
            <p className="text-muted-foreground mt-8 text-sm">Loading usage…</p>
          }
        >
          <Await resolve={usage}>
            {(data) => (
              <SkillsIndexUsage
                presentSlugs={presentSlugs}
                rangeDays={SKILL_USAGE_RANGE_DAYS}
                usage={data}
              />
            )}
          </Await>
        </React.Suspense>
      </GlobalScreen>
      <GlobalFeatureOnboardingModal content={SKILLS_ONBOARDING} />
    </>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  return runSkillRecordTagAction(args.request, formData);
};

export const ErrorBoundary = GlobalErrorBoundary;
