import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { AssigneeMultiSelect } from '../AssigneeMultiSelect';

describe('AssigneeMultiSelect', () => {
  test('renders trigger with Assignee placeholder', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <AssigneeMultiSelect
        onChange={onChange}
        options={['alice', 'bob']}
        value={[]}
      />,
    );

    expect(getByRole('button', { name: /^Assignee/i })).toBeInTheDocument();
  });

  test('opens list and shows @-prefixed options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { getByRole, findByRole } = render(
      <AssigneeMultiSelect
        onChange={onChange}
        options={['alice']}
        value={[]}
      />,
    );

    await user.click(getByRole('button', { name: /^Assignee/i }));

    const option = await findByRole('option', { name: '@alice' });
    expect(option).toBeInTheDocument();
  });
});
