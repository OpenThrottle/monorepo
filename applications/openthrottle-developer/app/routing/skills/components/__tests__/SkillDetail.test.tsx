import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SkillDetail } from '../SkillDetail';
import type { SkillDetailProps } from '../SkillDetail';

const baseEntry: RepoSkillEntry = {
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: '.agents/skills/brag-sheet/SKILL.md',
  slug: 'brag-sheet',
  source: 'external',
  summary: 'Vendored skill.',
  tags: undefined,
};

const renderDetail = (props: SkillDetailProps): RenderResult => {
  const Component = () => (
    <TooltipProvider>
      <SkillDetail {...props} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SkillDetail Component', () => {
  test('renders header, badges, path, and markdown content', () => {
    const component = renderDetail({
      content: '# Detail heading\n\nDetail body.\n',
      entry: { ...baseEntry, tags: ['docs', 'git'] },
    });

    expect(component.getByTestId('SkillDetail')).toBeInTheDocument();
    expect(component.getByText('/brag-sheet')).toBeInTheDocument();
    expect(component.getByText('External')).toBeInTheDocument();
    expect(component.getByText('Default (auto)')).toBeInTheDocument();
    expect(component.getByText('docs')).toBeInTheDocument();
    expect(component.getByText('git')).toBeInTheDocument();
    expect(
      component.getByText('.agents/skills/brag-sheet/SKILL.md'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'Detail heading' }),
    ).toBeInTheDocument();
  });

  test('links the external source badge to its sourceUrl', () => {
    const component = renderDetail({
      content: '# Body\n',
      entry: {
        ...baseEntry,
        sourceUrl: 'https://example.com/skills/brag-sheet',
      },
    });

    expect(component.getByTestId('skill-source-link')).toHaveAttribute(
      'href',
      'https://example.com/skills/brag-sheet',
    );
  });

  test('renders an unlinked OpenThrottle badge for owned skills', () => {
    const component = renderDetail({
      content: '# Body\n',
      entry: { ...baseEntry, slug: 'ot-plans', source: 'openthrottle' },
    });

    expect(component.getByText('OpenThrottle')).toBeInTheDocument();
    expect(component.queryByTestId('skill-source-link')).toBeNull();
  });

  test('shows the unreadable-file notice for empty content', () => {
    const component = renderDetail({ content: '', entry: baseEntry });

    expect(
      component.getByText(
        'The SKILL.md for this skill could not be read from disk.',
      ),
    ).toBeInTheDocument();
  });
});
