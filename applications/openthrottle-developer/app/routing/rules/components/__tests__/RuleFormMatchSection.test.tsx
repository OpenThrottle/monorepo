import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { ANY } from '~/routing/rules/data/rule-form-options';
import { RuleFormMatchSection } from '../RuleFormMatchSection';
import type { RuleFormMatchSectionProps } from '../RuleFormMatchSection';
import type { RuleFormVocabularyOption } from '../RuleForm';

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
      onStatusChange: vi.fn(),
      onToggleTag: vi.fn(),
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
});
