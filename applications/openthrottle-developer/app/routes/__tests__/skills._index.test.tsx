import * as React from 'react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import type { SkillsIndexUsageData } from '~/routing/skills/data/skills-index-usage';
import {
  SKILLS_EMPTY_COPY,
  SKILLS_ONBOARDING,
} from '~/routing/skills/data/data.copy';
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
  loaderEntries: RepoSkillEntry[] = entries,
): Route.ComponentProps['loaderData'] => ({
  entries: loaderEntries,
  personalSlugs: loaderEntries
    .filter((entry) => entry.isPersonal === true)
    .map((entry) => entry.slug),
  presentSlugs: loaderEntries.map((entry) => entry.slug),
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
  loaderEntries: RepoSkillEntry[] = entries,
) => {
  // Build loaderData ONCE so the deferred `usage` promise is stable across
  // re-renders — a fresh Promise per render makes <Await> re-suspend forever.
  const loaderData = buildLoaderData(usage, loaderEntries);
  const RoutesStub = createRoutesStub([
    {
      // Hardcode loaderData (no stub loader) so the first synchronous render
      // paints; the pager drives navigation via ?page, read from useSearchParams.
      Component: (): React.ReactElement => {
        // Surfaces the committed query string so URL-ownership assertions read
        // the real location rather than inferring it from the rendered slice.
        const location = useLocation();

        return (
          <TooltipProvider>
            <span data-testid="location-search">{location.search}</span>
            <Component
              actionData={undefined}
              loaderData={loaderData}
              matches={matches}
              params={{}}
            />
          </TooltipProvider>
        );
      },
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

describe('routes/skills._index.tsx ?source filtering', () => {
  test('bare /skills carries no source param and shows every entry', () => {
    const component = renderRoute('/skills');

    expect(component.getByTestId('location-search')).toHaveTextContent('');
    expect(
      component.getByText('Showing 1-25 of 40 skills'),
    ).toBeInTheDocument();
    expect(component.getByRole('radio', { name: 'All' })).toBeChecked();
  });

  test('?source=openthrottle filters on first paint and marks the segment', () => {
    const component = renderRoute('/skills?source=openthrottle');

    // 30 of the 40 fixtures are OpenThrottle-sourced.
    expect(
      component.getByText('Showing 1-25 of 30 skills'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('radio', { name: 'OpenThrottle' }),
    ).toBeChecked();
  });

  // A hand-edited or stale link must degrade to the full list, not 404.
  test('an unknown ?source value behaves as All', () => {
    const component = renderRoute('/skills?source=garbage');

    expect(
      component.getByText('Showing 1-25 of 40 skills'),
    ).toBeInTheDocument();
    expect(component.getByRole('radio', { name: 'All' })).toBeChecked();
  });

  test('selecting a segment writes ?source= and drops ?page', async () => {
    const user = userEvent.setup();
    const component = renderRoute('/skills?page=2');

    await user.click(component.getByRole('radio', { name: 'External' }));

    await waitFor(() => {
      expect(component.getByTestId('location-search')).toHaveTextContent(
        'source=external',
      );
    });
    expect(component.getByTestId('location-search')).not.toHaveTextContent(
      'page=',
    );
  });

  test('selecting All removes ?source= rather than writing source=all', async () => {
    const user = userEvent.setup();
    const component = renderRoute('/skills?source=external');

    await user.click(component.getByRole('radio', { name: 'All' }));

    await waitFor(() => {
      expect(component.getByTestId('location-search')).not.toHaveTextContent(
        'source=',
      );
    });
    expect(
      component.getByText('Showing 1-25 of 40 skills'),
    ).toBeInTheDocument();
  });

  test('a source change preserves sibling params', async () => {
    const user = userEvent.setup();
    const component = renderRoute('/skills?search=skill-03&limit=10&page=2');

    await user.click(component.getByRole('radio', { name: 'External' }));

    await waitFor(() => {
      expect(component.getByTestId('location-search')).toHaveTextContent(
        'source=external',
      );
    });
    const probe = component.getByTestId('location-search');
    expect(probe).toHaveTextContent('search=skill-03');
    expect(probe).toHaveTextContent('limit=10');
  });
});

describe('routes/skills._index.tsx pagination preserves filters', () => {
  test('a page change keeps ?source=', async () => {
    const user = userEvent.setup();
    const component = renderRoute('/skills?source=openthrottle');

    // 30 OpenThrottle fixtures span two pages at the default limit of 25.
    expect(
      component.getByText('Showing 1-25 of 30 skills'),
    ).toBeInTheDocument();

    await user.click(component.getByRole('link', { name: '2' }));

    await waitFor(() => {
      expect(
        component.getByText('Showing 26-30 of 30 skills'),
      ).toBeInTheDocument();
    });
    expect(component.getByTestId('location-search')).toHaveTextContent(
      'source=openthrottle',
    );
  });

  test('a page change keeps ?search=', async () => {
    const user = userEvent.setup();
    // Every fixture slug contains `skill-0`; limit=10 spans the 40 matches.
    const component = renderRoute('/skills?search=skill-0&limit=10');

    expect(
      component.getByText('Showing 1-10 of 40 skills'),
    ).toBeInTheDocument();

    await user.click(component.getByRole('link', { name: '2' }));

    await waitFor(() => {
      expect(
        component.getByText('Showing 11-20 of 40 skills'),
      ).toBeInTheDocument();
    });
    expect(component.getByTestId('location-search')).toHaveTextContent(
      'search=skill-0',
    );
  });

  test('a page change keeps a combined ?search= and ?source=', async () => {
    const user = userEvent.setup();
    const component = renderRoute(
      '/skills?search=skill-0&source=openthrottle&limit=10',
    );

    expect(
      component.getByText('Showing 1-10 of 30 skills'),
    ).toBeInTheDocument();

    await user.click(component.getByRole('link', { name: '3' }));

    await waitFor(() => {
      expect(
        component.getByText('Showing 21-30 of 30 skills'),
      ).toBeInTheDocument();
    });
    const probe = component.getByTestId('location-search');
    expect(probe).toHaveTextContent('search=skill-0');
    expect(probe).toHaveTextContent('source=openthrottle');
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

describe('routes/skills._index.tsx onboarding', () => {
  test('shows the pitch when no SKILL.md is discovered and nothing is filtered', () => {
    const component = renderRoute('/skills', unavailableUsage, []);

    // The teaching block replaces the toolbar, table, and pager entirely.
    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(component.queryByTestId('SkillsToolbar')).not.toBeInTheDocument();
    expect(component.queryByTestId('SkillsTable')).not.toBeInTheDocument();
    expect(
      component.queryByTestId('OpenThrottlePagination'),
    ).not.toBeInTheDocument();
    expect(
      component.getByRole('link', { name: SKILLS_ONBOARDING.cta.label }),
    ).toHaveAttribute('href', SKILLS_ONBOARDING.cta.to);
  });

  test('links the spec CTA out to a new tab', () => {
    const component = renderRoute('/skills', unavailableUsage, []);
    const secondary = SKILLS_ONBOARDING.secondary;

    // Narrowing keeps the assertion honest if the copy ever drops the link.
    expect(secondary).toBeDefined();
    const link = component.getByRole('link', { name: secondary?.label });
    expect(link).toHaveAttribute('href', secondary?.to);
    expect(link).toHaveAttribute('target', '_blank');
  });

  test('falls through to the table/empty state when a search is active', () => {
    const component = renderRoute(
      '/skills?search=nothing-matches',
      unavailableUsage,
      [],
    );

    // Filtered-but-empty is NOT a new user — keep the clear-search affordance.
    expect(
      component.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
    expect(component.getByTestId('SkillsToolbar')).toBeInTheDocument();
    expect(component.getByTestId('SkillsTable')).toBeInTheDocument();
    // The empty state knows a search is active, so it offers a way back out.
    expect(
      component.getByRole('heading', { name: SKILLS_EMPTY_COPY.searchTitle }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Clear filters' }),
    ).toHaveAttribute('href', '/skills');
  });

  test('falls through to the filtered empty state when only ?source= is active', () => {
    const component = renderRoute('/skills?source=personal', unavailableUsage, [
      ...entries,
    ]);

    // None of the fixtures are personal-tier, so the filtered set is empty —
    // but the list itself is not, so this is a filter, not a new user.
    expect(
      component.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
    expect(component.getByTestId('SkillsTable')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: SKILLS_EMPTY_COPY.searchTitle }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Clear filters' }),
    ).toHaveAttribute('href', '/skills');
    // The create-a-first-skill empty CTA is gone; the toolbar's own New skill
    // button is a different affordance and stays.
    expect(
      component.queryByRole('heading', { name: SKILLS_EMPTY_COPY.title }),
    ).not.toBeInTheDocument();
  });

  test('an empty checkout plus ?source= is filtered, not a new user', () => {
    const component = renderRoute(
      '/skills?source=personal',
      unavailableUsage,
      [],
    );

    expect(
      component.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
    expect(component.getByTestId('SkillsToolbar')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: SKILLS_EMPTY_COPY.searchTitle }),
    ).toBeInTheDocument();
  });

  test('a populated list renders the table with the trigger, not the inline pitch', () => {
    const component = renderRoute('/skills');

    expect(component.getByTestId('SkillsTable')).toBeInTheDocument();
    expect(
      component.getByTestId('GlobalFeatureOnboardingTrigger'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
  });

  test('?modal=onboarding opens the same pitch over a populated list', () => {
    const component = renderRoute('/skills?modal=onboarding');

    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    // Single-sourced copy: the modal shows the same title + tagline.
    expect(
      component.getByRole('heading', { name: SKILLS_ONBOARDING.title }),
    ).toBeInTheDocument();
    expect(component.getByText(SKILLS_ONBOARDING.tagline)).toBeInTheDocument();
    // The list stays behind the dialog.
    expect(component.getByTestId('SkillsTable')).toBeInTheDocument();
  });
});
