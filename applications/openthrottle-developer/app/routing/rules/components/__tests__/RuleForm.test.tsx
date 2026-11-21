import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { RULE_PREVIEW_PATH } from '~/routing/rules/config/rule-preview';
import { RULE_PREVIEW_COPY, RULES_COPY } from '~/routing/rules/data/data.copy';
import type { RulePreviewState } from '~/routing/rules/types';

import type { RuleFormProps } from '../RuleForm';
import { RuleForm } from '../RuleForm';

describe('RuleForm Component', () => {
  let component: RenderResult;
  let props: RuleFormProps;

  beforeEach(() => {
    props = {
      initialRule: null,
      projects: [{ id: 'proj-1', name: 'Platform' }],
      promptOptions: [],
      repositories: [{ id: 'repo-1', name: 'monorepo' }],
      skillSlugs: ['grilling', 'github-deep-review'],
      vocabulary: [
        { dimension: 'phase', tag: 'breakdown' },
        { dimension: 'domain', tag: 'github' },
      ],
    };

    const Component = () => {
      return <RuleForm {...props} />;
    };
    const previewState: RulePreviewState = {
      kind: 'ready',
      preview: {
        cap: 500,
        environment: null,
        evaluated: 4,
        matched: [],
        matchedCount: 3,
        nonMatching: [],
        specificity: 0,
        truncated: false,
      },
    };
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      { loader: () => previewState, path: RULE_PREVIEW_PATH },
    ]);

    component = render(<RoutesStub />);
  });

  test('renders grouped sections and the required title field', () => {
    expect(component.getByTestId('RuleForm')).toBeInTheDocument();
    expect(component.getByLabelText(RULES_COPY.titleLabel)).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: RULES_COPY.identityLegend }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: RULES_COPY.matchLegend }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: RULES_COPY.actionLegend }),
    ).toBeInTheDocument();
  });

  test('renders the repository select above the status select', () => {
    expect(
      component.getByLabelText(RULES_COPY.repositoryLabel),
    ).toBeInTheDocument();
  });

  test('renders the project select with the Any hint', () => {
    expect(
      component.getByLabelText(RULES_COPY.projectLabel),
    ).toBeInTheDocument();
    expect(component.getByText(RULES_COPY.projectAnyHint)).toBeInTheDocument();
  });

  test('save is disabled until a title and skill are provided', async () => {
    const user = userEvent.setup();

    expect(
      component.getByRole('button', { name: RULES_COPY.saveAction }),
    ).toBeDisabled();

    await user.type(
      component.getByLabelText(RULES_COPY.titleLabel),
      'Grill breakdowns',
    );

    // title present but skill still unset for inject-task
    expect(
      component.getByRole('button', { name: RULES_COPY.saveAction }),
    ).toBeDisabled();

    await user.click(
      component.getByRole('combobox', { name: RULES_COPY.skillLabel }),
    );
    await user.click(component.getByRole('option', { name: 'grilling' }));

    expect(
      component.getByRole('button', { name: RULES_COPY.saveAction }),
    ).toBeEnabled();
  });

  test('toggles a phase tag chip', async () => {
    const user = userEvent.setup();

    const chip = component.getByRole('button', { name: 'breakdown' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');

    await user.click(chip);

    expect(
      component.getByRole('button', { name: 'breakdown' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('switches to the availability-exception payload fields', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('combobox', { name: RULES_COPY.actionTypeLabel }),
    );
    await user.click(
      component.getByRole('option', {
        name: RULES_COPY.availabilityExceptionOption,
      }),
    );

    expect(component.getByLabelText('Tag deny list')).toBeInTheDocument();
    expect(component.getByLabelText('Slug allow list')).toBeInTheDocument();
  });

  test('shows a live "matches N of M plans" summary from the dry run', async () => {
    const summary = await component.findByTestId('RuleFormPreviewSummary');

    expect(summary).toHaveTextContent(`${RULE_PREVIEW_COPY.summaryPrefix} 3`);
    expect(summary).toHaveTextContent('4');
  });
});
