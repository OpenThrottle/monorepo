import * as React from 'react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
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

const loaderDataFor = (content: string) => ({
  content,
  editable: true,
  entry,
});

const matchesFor = (content: string): Route.ComponentProps['matches'] => [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/skills.$slug',
    loaderData: loaderDataFor(content),
    params: { slug: 'ot-plans' },
    pathname: '/skills/ot-plans',
  },
];

const renderRoute = (content: string) =>
  render(
    <TooltipProvider>
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={loaderDataFor(content)}
          matches={matchesFor(content)}
          params={{ slug: 'ot-plans' }}
        />
      </MemoryRouter>
    </TooltipProvider>,
  );

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
});
