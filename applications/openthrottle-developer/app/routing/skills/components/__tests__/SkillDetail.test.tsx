import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILL_DETAIL_COPY } from '~/routing/skills/data/data.copy';
import { SkillDetail } from '../SkillDetail';
import type { SkillDetailProps } from '../SkillDetail';

// Monaco cannot boot under jsdom; stand in a textarea with the same
// controlled value/onChange contract so dirty tracking is exercisable.
vi.mock('@openthrottle/react-router-editor', () => ({
  Editor: (props: {
    onChange?: (value: string | undefined) => void;
    value?: string;
  }) => (
    <textarea
      data-testid="mock-monaco"
      onChange={(event) => props.onChange?.(event.target.value)}
      value={props.value}
    />
  ),
}));

const baseEntry: RepoSkillEntry = {
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: '.agents/skills/brag-sheet/SKILL.md',
  slug: 'brag-sheet',
  source: 'external',
  summary: 'Vendored skill.',
  tags: undefined,
};

const renderDetail = (props: Partial<SkillDetailProps> = {}): RenderResult => {
  const merged: SkillDetailProps = {
    content: '# Detail heading\n\nDetail body.\n',
    draft: '# Detail heading\n\nDetail body.\n',
    entry: baseEntry,
    isEditing: false,
    onDraftChange: vi.fn(),
    ...props,
  };
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => <SkillDetail {...merged} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SkillDetail Component', () => {
  test('renders markdown content in read mode', () => {
    const component = renderDetail();

    expect(component.getByTestId('SkillDetail')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'Detail heading' }),
    ).toBeInTheDocument();
    expect(component.getByText('Detail body.')).toBeInTheDocument();
    expect(component.queryByTestId('skill-editor')).toBeNull();
  });

  test('shows the unreadable-file notice for empty content', () => {
    const component = renderDetail({ content: '', draft: '' });

    expect(
      component.getByText(SKILL_DETAIL_COPY.emptyContentNotice),
    ).toBeInTheDocument();
  });

  test('renders the editor seeded from the draft while editing', () => {
    const component = renderDetail({
      content: '# Seeded content\n',
      draft: '# Seeded content\n',
      isEditing: true,
    });

    expect(component.getByTestId('skill-editor')).toBeInTheDocument();
    expect(component.getByTestId('mock-monaco')).toHaveValue(
      '# Seeded content\n',
    );
    expect(
      component.queryByRole('heading', { name: 'Seeded content' }),
    ).toBeNull();
  });

  test('invokes onDraftChange when the editor value changes', async () => {
    const onDraftChange = vi.fn();
    const user = userEvent.setup();
    const component = renderDetail({
      content: 'original',
      draft: 'original',
      isEditing: true,
      onDraftChange,
    });

    await user.type(component.getByTestId('mock-monaco'), '!');

    expect(onDraftChange).toHaveBeenCalled();
  });
});
