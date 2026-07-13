import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RuleForm } from '../RuleForm';
import type { RuleFormProps } from '../RuleForm';

describe('RuleForm Component', () => {
  let component: RenderResult;
  let props: RuleFormProps;

  beforeEach(() => {
    props = {
      initialRule: null,
      onCancel: vi.fn(),
      onSubmit: vi.fn(),
      skillSlugs: ['grilling', 'github-deep-review'],
      vocabulary: [
        { dimension: 'phase', tag: 'breakdown' },
        { dimension: 'domain', tag: 'github' },
      ],
    };

    component = render(<RuleForm {...props} />);
  });

  test('submits an inject-task rule with the serialized payload', async () => {
    const user = userEvent.setup();

    await user.click(component.getByLabelText('breakdown'));
    await user.selectOptions(component.getByLabelText('Skill'), 'grilling');
    await user.click(component.getByRole('button', { name: 'Save rule' }));

    expect(props.onSubmit).toHaveBeenCalledWith({
      actionPayloadJson: JSON.stringify({
        placement: 'first',
        skillSlug: 'grilling',
      }),
      actionType: 'inject-task',
      enabled: true,
      environment: null,
      id: null,
      status: null,
      tagAll: ['breakdown'],
    });
  });

  test('save is disabled for inject-task until a skill is picked', () => {
    expect(component.getByRole('button', { name: 'Save rule' })).toBeDisabled();
  });

  test('switches to the availability-exception payload form and serializes lists', async () => {
    const user = userEvent.setup();

    await user.selectOptions(
      component.getByLabelText('Action type'),
      'availability-exception',
    );
    await user.type(
      component.getByLabelText('Tag deny list'),
      'github, terraform',
    );
    await user.click(component.getByRole('button', { name: 'Save rule' }));

    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionPayloadJson: JSON.stringify({
          slugAllow: [],
          slugDeny: [],
          tagAllow: [],
          tagDeny: ['github', 'terraform'],
        }),
        actionType: 'availability-exception',
      }),
    );
  });
});
