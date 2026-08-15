import * as React from 'react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import type { SkillDetailUsageData } from '~/routing/skills/data/skill-usage-detail';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Component from '../skills.$slug';
import type { Route } from '@/app/routes/+types/skills.$slug';

const entry: RepoSkillEntry = {
  disableModelInvocation: true,
  layout: 'agents',
  repoRelativePath: '.agents/skills/ot-plans/SKILL.md',
  slug: 'ot-plans',
  source: 'openthrottle',
  summary: 'OpenThrottle plans skill.',
  tags: ['openthrottle'],
};

const emptyUsage: SkillDetailUsageData = {
  available: true,
  byDay: [],
  skill: null,
};

const loaderDataFor = (
  content: string,
  usage: SkillDetailUsageData = emptyUsage,
) => ({
  content,
  editable: true,
  entry,
  metadata: {},
  rawContent: content,
  runOptions: Promise.resolve({ models: [], repositories: [] }),
  tagVocabulary: [],
  usage: Promise.resolve(usage),
});

const matchesFor = (
  content: string,
  usage?: SkillDetailUsageData,
): Route.ComponentProps['matches'] => [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/skills.$slug',
    loaderData: loaderDataFor(content, usage),
    params: { slug: 'ot-plans' },
    pathname: '/skills/ot-plans',
  },
];

const renderRoute = (
  content: string,
  usage?: SkillDetailUsageData,
  initialPath = '/',
) => {
  // Build loaderData ONCE so the deferred `usage` promise is stable across
  // re-renders — a fresh Promise per render makes <Await> re-suspend forever.
  const loaderData = loaderDataFor(content, usage);
  const matches = matchesFor(content, usage);
  // useFetcher in the route component requires a data router.
  const Wrapped = () => (
    <TooltipProvider>
      <Component
        actionData={undefined}
        loaderData={loaderData}
        matches={matches}
        params={{ slug: 'ot-plans' }}
      />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return render(<RoutesStub initialEntries={[initialPath]} />);
};

describe('routes/skills.$slug.tsx', () => {
  test('renders the skill header and the rendered SKILL.md content', () => {
    const component = renderRoute(
      '---\nname: ot-plans\n---\n\n# OT plans heading\n\nBody paragraph.\n',
    );

    expect(component.getByText('/ot-plans')).toBeInTheDocument();
    expect(
      component.getByText('OpenThrottle plans skill.'),
    ).toBeInTheDocument();
    expect(component.getByText('OpenThrottle')).toBeInTheDocument();
    expect(component.getByText('Manual only')).toBeInTheDocument();
    expect(
      component.getByText('.agents/skills/ot-plans/SKILL.md'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'OT plans heading' }),
    ).toBeInTheDocument();
    expect(component.getByText('Body paragraph.')).toBeInTheDocument();
  });

  test('renders the unreadable-file notice when content is empty', () => {
    const component = renderRoute('');

    expect(
      component.getByText(
        'The SKILL.md for this skill could not be read from disk.',
      ),
    ).toBeInTheDocument();
  });

  test('defaults to the Skill tab and does not mount the Usage tab', () => {
    const component = renderRoute('---\nname: ot-plans\n---\n\n# Body\n');

    expect(
      component.getByRole('heading', { name: 'Body' }),
    ).toBeInTheDocument();
    // Radix Tabs unmount inactive panels — usage is not rendered by default.
    expect(component.queryByTestId('SkillDetailUsage')).not.toBeInTheDocument();
  });

  test('switching to the Usage tab streams the empty usage state', async () => {
    const user = userEvent.setup();
    const component = renderRoute('---\nname: ot-plans\n---\n\n# Body\n');

    await user.click(component.getByRole('tab', { name: 'Usage' }));

    // Deferred (Await) — resolves after the tab shell paints.
    expect(
      await component.findByTestId('SkillDetailUsageEmpty'),
    ).toBeInTheDocument();
  });

  test('deep-linking ?tab=usage streams populated per-skill usage stats', async () => {
    const component = renderRoute(
      '---\nname: ot-plans\n---\n\n# Body\n',
      {
        available: true,
        byDay: [
          {
            date: '2026-08-05',
            oursCount: 5,
            thirdPartyCount: 0,
            totalCount: 5,
          },
        ],
        skill: {
          abandonedCount: 0,
          avgDurationMs: 1500,
          count: 5,
          errorCount: 0,
          lastUsedAt: '2026-08-05T12:00:00.000Z',
          outcomeCount: 3,
          scope: 'ours',
          skillName: 'ot-plans',
          successCount: 3,
        },
      },
      '/?tab=usage',
    );

    expect(
      await component.findByTestId('SkillDetailUsageStats'),
    ).toBeInTheDocument();
  });

  test('renders the unavailable notice in the Usage tab when usage could not load', async () => {
    const user = userEvent.setup();
    const component = renderRoute('---\nname: ot-plans\n---\n\n# Body\n', {
      available: false,
    });

    await user.click(component.getByRole('tab', { name: 'Usage' }));

    expect(
      await component.findByTestId('SkillDetailUsageUnavailable'),
    ).toBeInTheDocument();
  });
});
