import * as React from 'react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import type { SkillsIndexUsageData } from '~/routing/skills/data/skills-index-usage';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Component from '../skills._index';
import type { Route } from '@/app/routes/+types/skills._index';

const buildEntry = (
  index: number,
  source: RepoSkillEntry['source'],
): RepoSkillEntry => ({
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: `.agents/skills/skill-${String(index).padStart(3, '0')}/SKILL.md`,
  slug: `skill-${String(index).padStart(3, '0')}`,
  source,
  summary: `Summary for skill ${index}.`,
  tags: [source],
});

// 30 OpenThrottle (000-029) + 10 external (030-039) = 40 total.
const entries: RepoSkillEntry[] = [
  ...Array.from({ length: 30 }, (_v, i) => buildEntry(i, 'openthrottle')),
  ...Array.from({ length: 10 }, (_v, i) => buildEntry(i + 30, 'external')),
];

const unavailableUsage: SkillsIndexUsageData = { available: false };

const buildLoaderData = (
  usage: SkillsIndexUsageData = unavailableUsage,
): Route.ComponentProps['loaderData'] => ({
  entries,
  linkableSlugs: entries.map((entry) => entry.slug),
  tagVocabulary: [],
  usage: Promise.resolve(usage),
});

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/skills._index',
    loaderData: buildLoaderData(),
    params: {},
    pathname: '/skills',
  },
];

const renderRoute = (
  initialPath: string,
  usage: SkillsIndexUsageData = unavailableUsage,
) => {
  // Build loaderData ONCE so the deferred `usage` promise is stable across
  // re-renders — a fresh Promise per render makes <Await> re-suspend forever.
  const loaderData = buildLoaderData(usage);
  const RoutesStub = createRoutesStub([
    {
      // Hardcode loaderData (no stub loader) so the first synchronous render
      // paints; the pager drives navigation via ?page, read from useSearchParams.
      Component: (): React.ReactElement => (
        <TooltipProvider>
          <Component
            actionData={undefined}
            loaderData={loaderData}
            matches={matches}
            params={{}}
          />
        </TooltipProvider>
      ),
      path: '/skills',
    },
  ]);

  return render(<RoutesStub initialEntries={[initialPath]} />);
};

describe('routes/skills._index.tsx pagination', () => {
  test('renders only the first page slice with the pager summary', () => {
    const component = renderRoute('/skills');

    expect(
      component.getByRole('link', { name: '/skill-000' }),
    ).toBeInTheDocument();
    // Page-2-only slug is not rendered on page 1.
    expect(
      component.queryByRole('link', { name: '/skill-025' }),
    ).not.toBeInTheDocument();
    expect(
      component.getByText('Showing 1-25 of 40 skills'),
    ).toBeInTheDocument();
  });

  test('a stale out-of-range ?page clamps to the last page', () => {
    const component = renderRoute('/skills?page=99');

    // 40 items / 25 per page => last page is page 2 (items 26-40).
    expect(
      component.getByText('Showing 26-40 of 40 skills'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: '/skill-039' }),
    ).toBeInTheDocument();
  });

  test('navigating to page 2 swaps the rendered slice', async () => {
    const user = userEvent.setup();
    const component = renderRoute('/skills');

    await user.click(component.getByRole('link', { name: '2' }));

    await waitFor(() => {
      expect(
        component.getByText('Showing 26-40 of 40 skills'),
      ).toBeInTheDocument();
    });
    expect(
      component.getByRole('link', { name: '/skill-025' }),
    ).toBeInTheDocument();
    expect(
      component.queryByRole('link', { name: '/skill-000' }),
    ).not.toBeInTheDocument();
  });

  test('changing the source filter resets to page 1', async () => {
    const user = userEvent.setup();
    const component = renderRoute('/skills?page=2');

    // Start stranded on page 2 of the full list.
    expect(
      component.getByText('Showing 26-40 of 40 skills'),
    ).toBeInTheDocument();

    await user.click(component.getByRole('radio', { name: 'OpenThrottle' }));

    // OpenThrottle-only set (30) back on page 1 (items 1-25).
    await waitFor(() => {
      expect(
        component.getByText('Showing 1-25 of 30 skills'),
      ).toBeInTheDocument();
    });
    expect(
      component.getByRole('link', { name: '/skill-000' }),
    ).toBeInTheDocument();
  });
});

describe('routes/skills._index.tsx ?search filtering', () => {
  test('narrows the rendered rows to entries matching ?search', () => {
    const component = renderRoute('/skills?search=skill-007');

    // Only the matching slug renders; unrelated slugs drop out.
    expect(
      component.getByRole('link', { name: '/skill-007' }),
    ).toBeInTheDocument();
    expect(
      component.queryByRole('link', { name: '/skill-000' }),
    ).not.toBeInTheDocument();
    expect(
      component.queryByRole('link', { name: '/skill-008' }),
    ).not.toBeInTheDocument();
  });

  test('submitting a query via the toolbar filters the list off the stale page', async () => {
    const user = userEvent.setup();
    const component = renderRoute('/skills?page=2');

    // Stranded on page 2 of the full 40-item list (rows 26-40).
    expect(
      component.getByRole('link', { name: '/skill-039' }),
    ).toBeInTheDocument();
    expect(
      component.queryByRole('link', { name: '/skill-007' }),
    ).not.toBeInTheDocument();

    // `skill-007` lives on page 1 of the full list, so it is only reachable
    // after the committed search filters + the pager lands back on page 1
    // (transformCommittedParams drops ?page; the route also clamps).
    await user.type(
      component.getByRole('searchbox', { name: 'Search skills' }),
      'skill-007',
    );
    await user.click(component.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(
        component.getByRole('link', { name: '/skill-007' }),
      ).toBeInTheDocument();
    });
    // The former page-2 rows are gone — we are showing the filtered set.
    expect(
      component.queryByRole('link', { name: '/skill-039' }),
    ).not.toBeInTheDocument();
  });
});

describe('routes/skills._index.tsx usage sections', () => {
  test('streams the chart + leaderboard when usage is available', async () => {
    const component = renderRoute('/skills', {
      available: true,
      byDay: [
        { date: '2026-08-05', oursCount: 5, thirdPartyCount: 1, totalCount: 6 },
      ],
      bySkill: [
        {
          abandonedCount: 0,
          avgDurationMs: 1500,
          count: 5,
          errorCount: 0,
          outcomeCount: 3,
          scope: 'ours',
          skillName: 'skill-000',
          successCount: 3,
        },
      ],
    });

    // Deferred (Await) — resolves after the list paints.
    expect(
      await component.findByTestId('SkillUsageLeaderboard'),
    ).toBeInTheDocument();
    expect(component.getByTestId('SkillUsageDailyChart')).toBeInTheDocument();
    // Row links because skill-000 is a discovered on-disk slug.
    expect(component.getByRole('link', { name: 'skill-000' })).toHaveAttribute(
      'href',
      '/skills/skill-000',
    );
  });

  test('streams the empty leaderboard message when no invocations exist', async () => {
    const component = renderRoute('/skills', {
      available: true,
      byDay: [],
      bySkill: [],
    });

    expect(
      await component.findByTestId('SkillsIndexUsageEmpty'),
    ).toBeInTheDocument();
  });

  test('degrades to a notice when usage is unavailable', async () => {
    const component = renderRoute('/skills', { available: false });

    expect(
      await component.findByTestId('SkillsIndexUsageUnavailable'),
    ).toBeInTheDocument();
    // The skills table still rendered.
    expect(component.getByTestId('SkillsTable')).toBeInTheDocument();
  });
});
