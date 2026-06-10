import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { PromptsTable } from '../PromptsTable';
import type { PromptsTableProps } from '../PromptsTable';
import type { PromptCardFragment } from '~/__generated__/graphql';
import { CustomPromptType } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

const mockPrompts: PromptCardFragment[] = [
  {
    __typename: 'CustomPromptObject',
    content: '# First',
    createdAt: '2024-01-15T10:00:00Z',
    description: 'First prompt description',
    filePath: '/repo/agents/first.md',
    id: 'prompt-1',
    labels: ['alpha', 'beta', 'gamma', 'delta'],
    promptType: CustomPromptType.Agents,
    title: 'First Prompt',
    updatedAt: '2024-01-20T15:30:00Z',
  },
  {
    __typename: 'CustomPromptObject',
    content: '# Second',
    createdAt: '2024-02-01T08:00:00Z',
    description: null,
    filePath: null,
    id: 'prompt-2',
    labels: [],
    promptType: CustomPromptType.Skills,
    title: 'Second Prompt',
    updatedAt: '2024-02-05T12:00:00Z',
  },
];

const renderPromptsTable = (tableProps: PromptsTableProps): RenderResult =>
  renderRoutesStub(<PromptsTable {...tableProps} />);

describe('PromptsTable Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderPromptsTable({ prompts: [] });
  });

  test('shows empty state when prompts is empty', () => {
    expect(component.getByText('No prompts yet')).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'New prompt' })).toHaveAttribute(
      'href',
      '/prompts/create',
    );
    expect(component.getByTestId('PromptsTable')).toBeInTheDocument();
  });

  test('shows filtered empty copy when search is provided and prompts is empty', () => {
    const filtered = renderPromptsTable({ prompts: [], search: 'alpha' });

    expect(
      filtered.getByText('No prompts match your filters'),
    ).toBeInTheDocument();
    expect(
      filtered.getByRole('link', { name: 'Clear filters' }),
    ).toHaveAttribute('href', '/prompts');
  });

  test('renders table structure with column header when prompts exist', () => {
    const withPrompts = renderPromptsTable({ prompts: mockPrompts });

    expect(withPrompts.getAllByTestId('PromptsTable').length).toBeGreaterThan(
      0,
    );
    expect(
      withPrompts.getAllByRole('columnheader', { name: 'Prompt' }).length,
    ).toBeGreaterThan(0);
  });

  test('renders prompts from props with title links and type badges', () => {
    const { getByRole, getByText } = renderPromptsTable({
      prompts: mockPrompts,
    });

    expect(getByText('First Prompt')).toBeInTheDocument();
    expect(getByText('Second Prompt')).toBeInTheDocument();
    expect(getByText('Agents')).toBeInTheDocument();
    expect(getByText('Skills')).toBeInTheDocument();

    const titleLink1 = getByRole('link', { name: 'View prompt: First Prompt' });
    expect(titleLink1).toHaveAttribute('href', '/prompts/prompt-1');
    const titleLink2 = getByRole('link', {
      name: 'View prompt: Second Prompt',
    });
    expect(titleLink2).toHaveAttribute('href', '/prompts/prompt-2');
  });

  test('shows description, labels with overflow, and file basename when present', () => {
    const { getByText } = renderPromptsTable({ prompts: mockPrompts });

    expect(getByText('First prompt description')).toBeInTheDocument();
    expect(getByText('alpha')).toBeInTheDocument();
    expect(getByText('beta')).toBeInTheDocument();
    expect(getByText('gamma')).toBeInTheDocument();
    expect(getByText('+1')).toBeInTheDocument();
    expect(getByText('first.md')).toBeInTheDocument();
  });

  test('renders formatted updated date in table row', () => {
    const { container } = renderPromptsTable({ prompts: mockPrompts });

    expect(container.textContent).toContain('Jan');
    expect(container.textContent).toContain('2024');
  });
});
