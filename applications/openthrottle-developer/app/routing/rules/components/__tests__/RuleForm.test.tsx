import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { RuleForm } from '../RuleForm';
import type { RuleFormProps } from '../RuleForm';

describe('RuleForm Component', () => {
  let component: RenderResult;
  let props: RuleFormProps;

  beforeEach(() => {
    props = {
      initialRule: null,
      skillSlugs: ['grilling', 'github-deep-review'],
      vocabulary: [
        { dimension: 'phase', tag: 'breakdown' },
        { dimension: 'domain', tag: 'github' },
      ],
    };

    const Component = () => <RuleForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

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
});
