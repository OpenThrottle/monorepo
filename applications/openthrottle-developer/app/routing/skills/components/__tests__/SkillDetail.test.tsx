import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
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
  arguments: undefined,
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
    editable: true,
    entry: baseEntry,
    ...props,
  };
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => (
    <TooltipProvider>
      <SkillDetail {...merged} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SkillDetail Component', () => {
  test('renders header, badges, path, and markdown content', () => {
    const component = renderDetail({
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
      entry: { ...baseEntry, slug: 'ot-plans', source: 'openthrottle' },
    });

    expect(component.getByText('OpenThrottle')).toBeInTheDocument();
    expect(component.queryByTestId('skill-source-link')).toBeNull();
  });

  test('shows the unreadable-file notice for empty content', () => {
    const component = renderDetail({ content: '' });

    expect(
      component.getByText(
        'The SKILL.md for this skill could not be read from disk.',
      ),
    ).toBeInTheDocument();
  });

  describe('run control', () => {
    test('renders an enabled Run-now button by default', () => {
      const component = renderDetail();

      const run = component.getByTestId('skill-run-now');
      expect(run).toBeInTheDocument();
      expect(run).toBeEnabled();
    });

    test('disables Run-now when model invocation is effectively disabled', () => {
      const component = renderDetail({
        entry: { ...baseEntry, effectiveDisableModelInvocation: true },
      });

      expect(component.getByTestId('skill-run-now')).toBeDisabled();
    });
  });

  describe('edit mode', () => {
    test('toggles into edit mode with the editor seeded from the file', async () => {
      const user = userEvent.setup();
      const component = renderDetail({ content: '# Seeded content\n' });

      await user.click(component.getByTestId('skill-edit-button'));

      expect(component.getByTestId('skill-editor')).toBeInTheDocument();
      expect(component.getByTestId('mock-monaco')).toHaveValue(
        '# Seeded content\n',
      );
      // Read view is replaced while editing.
      expect(
        component.queryByRole('heading', { name: 'Seeded content' }),
      ).toBeNull();
    });

    test('typing marks the draft dirty and enables Save', async () => {
      const user = userEvent.setup();
      const component = renderDetail({ content: 'original' });

      await user.click(component.getByTestId('skill-edit-button'));

      const save = component.getByTestId('skill-save-button');
      expect(save).toBeDisabled();

      await user.type(component.getByTestId('mock-monaco'), ' changed');

      expect(save).toBeEnabled();
    });

    test('Save invokes onSave with the full draft', async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      const component = renderDetail({ content: 'original', onSave });

      await user.click(component.getByTestId('skill-edit-button'));
      await user.type(component.getByTestId('mock-monaco'), '!');
      await user.click(component.getByTestId('skill-save-button'));

      expect(onSave).toHaveBeenCalledWith('original!');
    });

    test('Cancel reverts the draft and returns to read mode', async () => {
      const user = userEvent.setup();
      const component = renderDetail({ content: '# Original heading\n' });

      await user.click(component.getByTestId('skill-edit-button'));
      await user.type(component.getByTestId('mock-monaco'), 'scrapped');
      await user.click(component.getByTestId('skill-cancel-button'));

      expect(component.queryByTestId('skill-editor')).toBeNull();
      expect(
        component.getByRole('heading', { name: 'Original heading' }),
      ).toBeInTheDocument();

      // Re-entering edit re-seeds from the pristine content.
      await user.click(component.getByTestId('skill-edit-button'));
      expect(component.getByTestId('mock-monaco')).toHaveValue(
        '# Original heading\n',
      );
    });

    test('disables Save and Cancel while saving', async () => {
      const user = userEvent.setup();
      const component = renderDetail({ content: 'original', saving: true });

      await user.click(component.getByTestId('skill-edit-button'));

      expect(component.getByTestId('skill-save-button')).toBeDisabled();
      expect(component.getByTestId('skill-cancel-button')).toBeDisabled();
    });

    test('shows a disabled Edit affordance with tooltip when not editable', () => {
      const component = renderDetail({ editable: false });

      expect(component.queryByTestId('skill-edit-button')).toBeNull();
      const disabled = component.getByTestId('skill-edit-disabled');
      expect(disabled).toBeInTheDocument();
      expect(disabled.querySelector('button')).toBeDisabled();
    });
  });
});
