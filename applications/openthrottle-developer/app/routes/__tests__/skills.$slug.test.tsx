import * as React from 'react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
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
  runOptions: Promise.resolve({ models: [], repositories: [] }),
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

const renderRoute = (content: string, usage?: SkillDetailUsageData) => {
  // useFetcher in the route component requires a data router.
  const Wrapped = () => (
    <TooltipProvider>
      <Component
        actionData={undefined}
        loaderData={loaderDataFor(content, usage)}
        matches={matchesFor(content, usage)}
        params={{ slug: 'ot-plans' }}
      />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return render(<RoutesStub />);
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

  test('streams the empty usage state beneath the SKILL.md content', async () => {
    const component = renderRoute('---\nname: ot-plans\n---\n\n# Body\n');

    // Deferred (Await) — resolves after the shell paints.
    expect(
      await component.findByTestId('SkillDetailUsageEmpty'),
    ).toBeInTheDocument();
    // SKILL.md content still rendered.
    expect(
      component.getByRole('heading', { name: 'Body' }),
    ).toBeInTheDocument();
  });

  test('streams populated per-skill usage stats when present', async () => {
    const component = renderRoute('---\nname: ot-plans\n---\n\n# Body\n', {
      available: true,
      byDay: [
        { date: '2026-08-05', oursCount: 5, thirdPartyCount: 0, totalCount: 5 },
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
    });

    expect(
      await component.findByTestId('SkillDetailUsageStats'),
    ).toBeInTheDocument();
  });

  test('renders the unavailable notice when usage could not be loaded', async () => {
    const component = renderRoute('---\nname: ot-plans\n---\n\n# Body\n', {
      available: false,
    });

    expect(
      await component.findByTestId('SkillDetailUsageUnavailable'),
    ).toBeInTheDocument();
  });
});
