import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { ANY } from '~/routing/rules/data/data.rule-form-options';

import type { RuleFormVocabularyOption } from '../RuleForm';
import type { RuleFormMatchSectionProps } from '../RuleFormMatchSection';
import { RuleFormMatchSection } from '../RuleFormMatchSection';

const vocabulary: RuleFormVocabularyOption[] = [
  { dimension: 'phase', tag: 'planning' },
  { dimension: 'domain', tag: 'billing' },
];

describe('RuleFormMatchSection Component', () => {
  let component: RenderResult;
  let props: RuleFormMatchSectionProps;

  beforeEach(() => {
    props = {
      environment: ANY,
      onEnvironmentChange: vi.fn(),
      onRepositoryChange: vi.fn(),
      onStatusChange: vi.fn(),
      onToggleTag: vi.fn(),
      repositories: [
        { id: 'repo-1', name: 'monorepo' },
        { id: 'repo-2', name: 'website' },
      ],
      repositoryId: ANY,
      status: ANY,
      tagAll: [],
      vocabulary,
    };

    component = render(<RuleFormMatchSection {...props} />);
  });

  test('renders phase and domain tag chips split by dimension', () => {
    expect(
      component.getByRole('button', { name: 'planning' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'billing' }),
    ).toBeInTheDocument();
  });

  test('shows the "no tags" hint when tagAll is empty', () => {
    expect(component.getByText(RULES_COPY.noTagsHint)).toBeInTheDocument();
  });

  test('hides the "no tags" hint once a tag is selected', () => {
    component.unmount();
    component = render(
      <RuleFormMatchSection {...props} tagAll={['planning']} />,
    );

    expect(component.queryByText(RULES_COPY.noTagsHint)).toBeNull();
  });

  test('invokes onToggleTag when a tag chip is clicked', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'planning' }));

    expect(props.onToggleTag).toHaveBeenCalledWith('planning');
  });

  test('renders the status and environment selects with labels', () => {
    expect(
      component.getByLabelText(RULES_COPY.statusLabel),
    ).toBeInTheDocument();
    expect(
      component.getByLabelText(RULES_COPY.environmentLabel),
    ).toBeInTheDocument();
  });

  test('renders the environment hint explaining when a qualified rule applies', () => {
    expect(
      component.getByText(RULES_COPY.environmentDescription),
    ).toBeInTheDocument();
  });

  test('renders the repository select with the blank-matches-all hint', () => {
    expect(
      component.getByLabelText(RULES_COPY.repositoryLabel),
    ).toBeInTheDocument();
    expect(
      component.getByText(RULES_COPY.repositoryAnyHint),
    ).toBeInTheDocument();
  });

  test('shows the selected repository name and lists the registered ones', async () => {
    const user = userEvent.setup();
    component.unmount();
    component = render(
      <RuleFormMatchSection {...props} repositoryId="repo-2" />,
    );

    expect(
      component.getByRole('combobox', { name: RULES_COPY.repositoryLabel }),
    ).toHaveTextContent('website');

    await user.click(
      component.getByRole('combobox', { name: RULES_COPY.repositoryLabel }),
    );

    expect(
      component.getByRole('option', { name: 'monorepo' }),
    ).toBeInTheDocument();
  });

  test('invokes onRepositoryChange when a repository is picked', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('combobox', { name: RULES_COPY.repositoryLabel }),
    );
    await user.click(component.getByRole('option', { name: 'monorepo' }));

    expect(props.onRepositoryChange).toHaveBeenCalledWith('repo-1');
  });
});
