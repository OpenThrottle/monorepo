import * as React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { renderRoutesStub } from '../../../../testing/route-fixtures';
import { SkillsTable } from '../SkillsTable';
import type { SkillsTableProps } from '../SkillsTable';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

const mockEntries: readonly RepoSkillEntry[] = [
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/brag-sheet/SKILL.md',
    slug: 'brag-sheet',
    summary: 'Build impact statements from commits and PR activity.',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-workspace/SKILL.md',
    slug: 'nx-workspace',
    summary: 'Explore Nx projects, targets, and dependency graph.',
  },
];

describe('SkillsTable Component', () => {
  let props: SkillsTableProps;

  beforeEach(() => {
    props = {};
  });

  test('when entries is empty renders SkillsEmpty inside the table', () => {
    renderRoutesStub(<SkillsTable {...props} />);

    expect(
      screen.getByText(
        'No skills found, create your first skill to get started.',
      ),
    ).toBeInTheDocument();
  });

  describe('when entries are provided', () => {
    beforeEach(() => {
      cleanup();
      props = { entries: mockEntries };
    });

    test('renders table shell and column headers', () => {
      renderRoutesStub(<SkillsTable {...props} />);

      expect(screen.getByTestId('SkillsTable')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Owner' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Summary' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Actions' }),
      ).toBeInTheDocument();
    });

    test('renders table rows from entries', () => {
      renderRoutesStub(<SkillsTable {...props} />);

      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Cursor')).toBeInTheDocument();
      expect(screen.getByText('/brag-sheet')).toBeInTheDocument();
      expect(screen.getByText('/nx-workspace')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Build impact statements from commits and PR activity.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Explore Nx projects, targets, and dependency graph.'),
      ).toBeInTheDocument();
    });
  });
});
