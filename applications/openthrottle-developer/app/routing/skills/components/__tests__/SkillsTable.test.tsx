import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
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
  let component: RenderResult;
  let props: SkillsTableProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SkillsTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders table shell', () => {
    expect(component.getByTestId('SkillsTable')).toBeInTheDocument();
    expect(component.getByRole('table')).toBeInTheDocument();
  });

  test('renders table headers', () => {
    expect(
      component.getByRole('columnheader', { name: 'Layout' }),
    ).toBeDefined();
    expect(component.getByRole('columnheader', { name: 'Slug' })).toBeDefined();
    expect(component.getByRole('columnheader', { name: 'Path' })).toBeDefined();
    expect(
      component.getByRole('columnheader', { name: 'Summary' }),
    ).toBeDefined();
  });

  test('shows no results when entries is empty', () => {
    expect(component.getByText('No results.')).toBeInTheDocument();
  });

  describe('when entries are provided', () => {
    beforeEach(() => {
      props = { entries: mockEntries };
      const Component = () => <SkillsTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('renders table rows from entries', () => {
      expect(component.getByText('agents')).toBeInTheDocument();
      expect(component.getByText('cursor')).toBeInTheDocument();
      expect(component.getByText('brag-sheet')).toBeInTheDocument();
      expect(component.getByText('nx-workspace')).toBeInTheDocument();
      expect(
        component.getByText('.agents/skills/brag-sheet/SKILL.md'),
      ).toBeInTheDocument();
      expect(
        component.getByText(
          'Build impact statements from commits and PR activity.',
        ),
      ).toBeInTheDocument();
    });
  });
});
