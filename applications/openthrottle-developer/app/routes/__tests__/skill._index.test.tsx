import * as React from 'react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import SkillsIndex from '../skills._index';

const SAMPLE_ENTRIES: readonly RepoSkillEntry[] = [
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-workspace/SKILL.md',
    slug: 'nx-workspace',
    summary: 'Explore Nx workspace structure.',
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
            matches={[] as never}
            params={{}}
          />
        </MemoryRouter>
      </TooltipProvider>,
    );

    expect(screen.getByTestId('SkillsTable')).toBeInTheDocument();
  });
});
