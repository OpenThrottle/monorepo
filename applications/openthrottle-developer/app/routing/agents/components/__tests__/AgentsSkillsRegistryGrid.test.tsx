import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AgentsSkillsRegistryGrid } from '../AgentsSkillsRegistryGrid';
import type { AgentsSkillsRegistryGridProps } from '../AgentsSkillsRegistryGrid';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

const entry = (overrides: Partial<RepoSkillEntry> = {}): RepoSkillEntry => ({
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: 'skills/ot-plans/SKILL.md',
  slug: 'ot-plans',
  source: 'openthrottle',
  summary: 'Manage OpenThrottle plans and tasks.',
  tags: undefined,
  ...overrides,
});

describe('AgentsSkillsRegistryGrid Component', () => {
  let component: RenderResult;
  let props: AgentsSkillsRegistryGridProps;

  beforeEach(() => {
    props = { entries: [entry()] };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('renders the slug, summary, and path for each entry', () => {
    component = render(<AgentsSkillsRegistryGrid {...props} />);

    expect(component.getByText('ot-plans')).toBeInTheDocument();
    expect(
      component.getByText('Manage OpenThrottle plans and tasks.'),
    ).toBeInTheDocument();
    expect(component.getByText('skills/ot-plans/SKILL.md')).toBeInTheDocument();
  });

  test('renders tags when present', () => {
    props = { entries: [entry({ tags: ['plans', 'ot'] })] };
    component = render(<AgentsSkillsRegistryGrid {...props} />);

    expect(component.getByText('plans')).toBeInTheDocument();
    expect(component.getByText('ot')).toBeInTheDocument();
  });

  test('renders the effective badge and provenance when resolved', () => {
    props = {
      entries: [
        entry({
          effectiveDisableModelInvocation: true,
          provenance: 'posture:deny',
        }),
      ],
    };
    component = render(<AgentsSkillsRegistryGrid {...props} />);

    expect(component.getByText('Effective')).toBeInTheDocument();
    expect(
      component.getByText(/Denied by the project's deny posture/),
    ).toBeInTheDocument();
    expect(component.getByText('posture:deny')).toBeInTheDocument();
  });

  test('renders a GitHub link pointing at the repo-relative path', () => {
    component = render(<AgentsSkillsRegistryGrid {...props} />);

    const link = component.getByRole('link', { name: /View on GitHub/i });
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('skills/ot-plans/SKILL.md'),
    );
  });

  test('copies the repo-relative path when Copy path is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    component = render(<AgentsSkillsRegistryGrid {...props} />);

    await userEvent.click(component.getByRole('button', { name: 'Copy path' }));

    expect(writeText).toHaveBeenCalledWith('skills/ot-plans/SKILL.md');
  });
  test('marks a personal-tier entry so it is not mistaken for a shared skill', () => {
    component = render(
      <AgentsSkillsRegistryGrid
        entries={[entry({ isPersonal: true, slug: 'my-draft' })]}
      />,
    );

    expect(component.getByTestId('skill-personal-badge')).toHaveTextContent(
      'Personal',
    );
  });

  test('leaves an ordinary entry unmarked', () => {
    component = render(<AgentsSkillsRegistryGrid {...props} />);

    expect(component.queryByTestId('skill-personal-badge')).toBeNull();
  });
});
