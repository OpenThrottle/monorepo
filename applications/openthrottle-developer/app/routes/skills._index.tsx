import * as React from 'react';
import { Await, useSearchParams } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import { GetUsageSkillUsageDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { SkillsIndexUsage } from '~/routing/skills/components/SkillsIndexUsage';
import { SkillsIntroduction } from '~/routing/skills/components/SkillsIntroduction';
import { SkillsTable } from '~/routing/skills/components/SkillsTable';
import { SkillsToolbar } from '~/routing/skills/components/SkillsToolbar';
import { SKILL_USAGE_RANGE_DAYS } from '~/routing/skills/config/skill-usage';
import {
  loadProjectSkillFlags,
  loadSkillAvailability,
} from '~/routing/skills/data/skill-index-loaders';
import { mergeRepoSkillsWithProjectSkills } from '~/routing/skills/utils/merge-project-skills';
import {
  filterSkillsBySource,
  type SkillSourceFilter,
} from '~/routing/skills/utils/filter-skills-by-source';
import { mergeRepoSkillsWithSkillAvailability } from '~/routing/skills/utils/merge-skill-availability';
import {
  parsePaginationLimit,
  parsePaginationPage,
} from '~/routing/skills/utils/parse-skills-pagination';
import { toSkillsIndexUsageData } from '~/routing/skills/utils/to-skills-index-usage-data';
import type { SkillsIndexUsageData } from '~/routing/skills/data/skills-index-usage';
import type { Route } from '@/app/routes/+types/skills._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Skills',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { discoverRepoSkills } =
    await import('~/routing/agents/data/discover-repo-skills.server');

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

  // Leaderboard rows link through only when their `skillName` matches a
  // discovered on-disk slug — reuse the same disk gate `/skills/$slug` uses to
  // 404 so links never depend on DB ingest/auth state (mirrors /usage).
  const linkableSlugs = diskEntries.map((entry) => entry.slug);

  // Deferred aggregate usage over a fixed 30-day window (YYYY-MM-DD, matching
  // the /usage contract; all skills, no scope/branch/cwd filter). Streamed as a
  // naked promise so the skills list + table paint immediately. `skillUsage` is
  // guarded by SETTINGS_READ; any failure resolves to the unavailable sentinel
  // so the route still renders 200 and degrades to a notice instead of throwing.
  const end = new Date();
  const start = new Date(
    end.getTime() - SKILL_USAGE_RANGE_DAYS * 24 * 60 * 60 * 1000,
  );
  const usage: Promise<SkillsIndexUsageData> = executeGraphqlWithAuth(
    args.request,
    GetUsageSkillUsageDocument,
    {
      cwd: null,
      end: end.toISOString().slice(0, 10),
      gitBranch: null,
      scope: null,
      start: start.toISOString().slice(0, 10),
    },
  )
    .then(({ skillUsage }) => toSkillsIndexUsageData(skillUsage))
    .catch(() => ({ available: false as const }));

  return { entries, linkableSlugs, usage };
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
  const { entries, linkableSlugs, usage } = props.loaderData;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const [sourceFilter, setSourceFilter] =
    React.useState<SkillSourceFilter>('all');

  // Setup
  const filteredEntries = React.useMemo(
    () => [...filterSkillsBySource(entries, sourceFilter)],
    [entries, sourceFilter],
  );

  const limit = parsePaginationLimit(searchParams.get('limit'));
  const totalCount = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  // Clamp so a stale/out-of-range ?page never renders an empty slice.
  const page = Math.min(
    parsePaginationPage(searchParams.get('page')),
    totalPages,
  );

  const offset = (page - 1) * limit;
  const pageEntries = React.useMemo(
    () => filteredEntries.slice(offset, offset + limit),
    [filteredEntries, limit, offset],
  );

  // Handlers
  const handleSourceFilterChange = (filter: SkillSourceFilter): void => {
    setSourceFilter(filter);
    // Reset to page 1 so the user is never stranded on an out-of-range page
    // after the filtered set shrinks; preserve any other query params.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('page');

        return next;
      },
      { preventScrollReset: true },
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <GlobalScreen>
        <SkillsIntroduction entries={[...entries]} />

        <div className="flex flex-col gap-4">
          <SkillsToolbar
            onSourceFilterChange={handleSourceFilterChange}
            sourceFilter={sourceFilter}
          />
          <SkillsTable className="bg-card" entries={pageEntries} />
        </div>

        <OpenThrottlePagination
          basePath="/skills"
          className="mt-8"
          limit={limit}
          page={page}
          resultLabel="skills"
          total={totalCount}
        />

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
                linkableSlugs={linkableSlugs}
                rangeDays={SKILL_USAGE_RANGE_DAYS}
                usage={data}
              />
            )}
          </Await>
        </React.Suspense>
      </GlobalScreen>
    </>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
