import * as React from 'react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { buildRootMatch } from '~/testing/root-match-fixture';
import SkillsIndex from '../skills._index';
import type { Route } from '@/app/routes/+types/skills._index';

const SAMPLE_ENTRIES: readonly RepoSkillEntry[] = [
  {
    disableModelInvocation: undefined,
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-workspace/SKILL.md',
    slug: 'nx-workspace',
    source: 'external',
    summary: 'Explore Nx workspace structure.',
    tags: undefined,
  },
];

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/skills._index',
    loaderData: { entries: SAMPLE_ENTRIES },
    params: {},
    pathname: '/',
  },
];

/**
 * @description Route module is `skills._index`; this spec file name is historical.
 */
describe('routes/skills._index.tsx', () => {
  test('should render', () => {
    render(
      <TooltipProvider>
        <MemoryRouter>
          <SkillsIndex
            actionData={undefined}
            loaderData={{ entries: SAMPLE_ENTRIES }}
            matches={matches}
            params={{}}
          />
        </MemoryRouter>
      </TooltipProvider>,
    );

    expect(screen.getByTestId('SkillsTable')).toBeInTheDocument();
  });
});
