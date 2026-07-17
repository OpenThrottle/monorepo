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

  test('renders the title field and the form shell', () => {
    expect(component.getByTestId('RuleForm')).toBeInTheDocument();
    expect(component.getByLabelText(RULES_COPY.titleLabel)).toBeInTheDocument();
  });

  test('save is disabled until a title and skill are provided', async () => {
    const user = userEvent.setup();

    expect(component.getByRole('button', { name: 'Save rule' })).toBeDisabled();

    await user.type(
      component.getByLabelText(RULES_COPY.titleLabel),
      'Grill breakdowns',
    );
    await user.selectOptions(component.getByLabelText('Skill'), 'grilling');

    expect(component.getByRole('button', { name: 'Save rule' })).toBeEnabled();
  });

  test('switches to the availability-exception payload fields', async () => {
    const user = userEvent.setup();

    await user.selectOptions(
      component.getByLabelText('Action type'),
      'availability-exception',
    );

    expect(component.getByLabelText('Tag deny list')).toBeInTheDocument();
  });
});
