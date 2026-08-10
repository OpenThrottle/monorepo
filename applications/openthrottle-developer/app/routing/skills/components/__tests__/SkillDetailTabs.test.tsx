import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILL_DETAIL_COPY } from '~/routing/skills/data/data.copy';
import type { SkillDetailUsageData } from '~/routing/skills/data/skill-usage-detail';
import { SkillDetailTabs } from '../SkillDetailTabs';
import type { SkillDetailTabsProps } from '../SkillDetailTabs';

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

// Editing is gated on provenance, so the default entry for these tests is an
// OpenThrottle-authored skill; the source-badge tests pass `baseEntry` (external)
// explicitly.
const ownedEntry: RepoSkillEntry = {
  ...baseEntry,
  repoRelativePath: 'skills/brag-sheet/SKILL.md',
  source: 'openthrottle',
};

const emptyUsage: SkillDetailUsageData = {
  available: true,
  byDay: [],
  skill: null,
};

const renderTabs = (
  props: Partial<SkillDetailTabsProps> = {},
): RenderResult => {
  const content = props.content ?? '# Detail heading\n\nDetail body.\n';
  const merged: SkillDetailTabsProps = {
    content,
    editable: true,
    entry: ownedEntry,
    // Default the editor source to the rendered content so tests that pass only
    // `content` still seed the editor from it; override to assert the split.
    rawContent: content,
    usage: Promise.resolve(emptyUsage),
    ...props,
  };
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => (
    <TooltipProvider>
      <SkillDetailTabs {...merged} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SkillDetailTabs Component', () => {
  test('renders introduction, badges, path, and markdown content', () => {
    const component = renderTabs({
      entry: { ...baseEntry, tags: ['docs', 'git'] },
    });

    expect(component.getByTestId('SkillIntroduction')).toBeInTheDocument();
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
    const component = renderTabs({
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
    const component = renderTabs({
      entry: { ...baseEntry, slug: 'ot-plans', source: 'openthrottle' },
    });

    expect(component.getByText('OpenThrottle')).toBeInTheDocument();
    expect(component.queryByTestId('skill-source-link')).toBeNull();
  });

  describe('run control', () => {
    test('renders an enabled Run-now button by default', () => {
      const component = renderTabs();

      const run = component.getByTestId('skill-run-now');
      expect(run).toBeInTheDocument();
      expect(run).toBeEnabled();
    });

    test('disables Run-now when model invocation is effectively disabled', () => {
      const component = renderTabs({
        entry: { ...baseEntry, effectiveDisableModelInvocation: true },
      });

      expect(component.getByTestId('skill-run-now')).toBeDisabled();
    });
  });

  describe('edit mode', () => {
    test('toggles into edit mode with the editor seeded from the file', async () => {
      const user = userEvent.setup();
      const component = renderTabs({ content: '# Seeded content\n' });

      await user.click(component.getByTestId('skill-edit-button'));

      expect(component.getByTestId('skill-editor')).toBeInTheDocument();
      expect(component.getByTestId('mock-monaco')).toHaveValue(
        '# Seeded content\n',
      );
      expect(
        component.queryByRole('heading', { name: 'Seeded content' }),
      ).toBeNull();
    });

    test('seeds the editor from the full rawContent while read mode shows the stripped body', async () => {
      const user = userEvent.setup();
      const component = renderTabs({
        content: '# Heading\n\nBody.\n',
        rawContent: '---\nname: brag-sheet\n---\n\n# Heading\n\nBody.\n',
      });

      // Read mode renders the stripped body only — no frontmatter delimiters.
      expect(
        component.getByRole('heading', { name: 'Heading' }),
      ).toBeInTheDocument();

      await user.click(component.getByTestId('skill-edit-button'));

      // The editor round-trips the whole file, frontmatter included.
      expect(component.getByTestId('mock-monaco')).toHaveValue(
        '---\nname: brag-sheet\n---\n\n# Heading\n\nBody.\n',
      );
    });

    test('Save round-trips the full file so frontmatter is preserved', async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      const component = renderTabs({
        content: '# Heading\n\nBody.\n',
        onSave,
        rawContent: '---\nname: brag-sheet\n---\n\n# Heading\n\nBody.\n',
      });

      await user.click(component.getByTestId('skill-edit-button'));
      await user.type(component.getByTestId('mock-monaco'), '!');
      await user.click(component.getByTestId('skill-save-button'));

      expect(onSave).toHaveBeenCalledWith(
        '---\nname: brag-sheet\n---\n\n# Heading\n\nBody.\n!',
      );
    });

    test('typing marks the draft dirty and enables Save', async () => {
      const user = userEvent.setup();
      const component = renderTabs({ content: 'original' });

      await user.click(component.getByTestId('skill-edit-button'));

      const save = component.getByTestId('skill-save-button');
      expect(save).toBeDisabled();

      await user.type(component.getByTestId('mock-monaco'), ' changed');

      expect(save).toBeEnabled();
    });

    test('Save invokes onSave with the full draft', async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      const component = renderTabs({ content: 'original', onSave });

      await user.click(component.getByTestId('skill-edit-button'));
      await user.type(component.getByTestId('mock-monaco'), '!');
      await user.click(component.getByTestId('skill-save-button'));

      expect(onSave).toHaveBeenCalledWith('original!');
    });

    test('Cancel reverts the draft and returns to read mode', async () => {
      const user = userEvent.setup();
      const component = renderTabs({ content: '# Original heading\n' });

      await user.click(component.getByTestId('skill-edit-button'));
      await user.type(component.getByTestId('mock-monaco'), 'scrapped');
      await user.click(component.getByTestId('skill-cancel-button'));

      expect(component.queryByTestId('skill-editor')).toBeNull();
      expect(
        component.getByRole('heading', { name: 'Original heading' }),
      ).toBeInTheDocument();

      await user.click(component.getByTestId('skill-edit-button'));
      expect(component.getByTestId('mock-monaco')).toHaveValue(
        '# Original heading\n',
      );
    });

    test('disables Save and Cancel while saving', async () => {
      const user = userEvent.setup();
      const component = renderTabs({ content: 'original', saving: true });

      await user.click(component.getByTestId('skill-edit-button'));

      expect(component.getByTestId('skill-save-button')).toBeDisabled();
      expect(component.getByTestId('skill-cancel-button')).toBeDisabled();
    });

    test('shows a disabled Edit affordance with tooltip when not editable', () => {
      const component = renderTabs({ editable: false });

      expect(component.queryByTestId('skill-edit-button')).toBeNull();
      const disabled = component.getByTestId('skill-edit-disabled');
      expect(disabled).toBeInTheDocument();
      expect(disabled.querySelector('button')).toBeDisabled();
    });

    test('disables Edit for an external skill even with a local checkout', async () => {
      const user = userEvent.setup();
      const component = renderTabs({ editable: true, entry: baseEntry });

      expect(component.queryByTestId('skill-edit-button')).toBeNull();
      const disabled = component.getByTestId('skill-edit-disabled');
      expect(disabled.querySelector('button')).toBeDisabled();

      await user.hover(disabled);
      expect(
        await component.findByText(SKILL_DETAIL_COPY.editExternalTooltip),
      ).toBeInTheDocument();
      // The editor never mounts, so no draft can be typed against upstream.
      expect(component.queryByTestId('skill-editor')).toBeNull();
    });
  });
});
