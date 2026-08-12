import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useFetcher } from 'react-router';
import { describe, expect, test } from 'vitest';
import { RoleEditSheet } from '../RoleEditSheet';
import type { RoleEditSheetProps } from '../RoleEditSheet';
import type { action as roleDetailAction } from '~/routes/roles.$roleId';

const role: RoleEditSheetProps['role'] = {
  __typename: 'RoleObject',
  createdAt: new Date('2025-01-01'),
  description: 'Administrator',
  id: 'role-1',
  name: 'admin',
  permissions: [],
  updatedAt: new Date('2025-01-02'),
};

const renderSheet = (
  props: Partial<Pick<RoleEditSheetProps, 'open'>> = {},
): RenderResult => {
  const Harness = () => {
    const fetcher = useFetcher<typeof roleDetailAction>();
    const [open, setOpen] = React.useState(props.open ?? false);

    return (
      <RoleEditSheet
        fetcher={fetcher}
        onOpenChange={setOpen}
        open={open}
        role={role}
      />
    );
  };

  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub />);
};

describe('RoleEditSheet Component', () => {
  test('opens with the role name and description pre-filled', async () => {
    const user = userEvent.setup();
    const component = renderSheet();

    await user.click(component.getByRole('button', { name: 'Edit role' }));

    expect(await component.findByLabelText('Name')).toHaveValue('admin');
    expect(component.getByLabelText('Description')).toHaveValue(
      'Administrator',
    );
  });

  test('closes when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const component = renderSheet();

    await user.click(component.getByRole('button', { name: 'Edit role' }));
    await component.findByLabelText('Name');

    await user.click(component.getByRole('button', { name: 'Cancel' }));

    expect(component.queryByLabelText('Name')).not.toBeInTheDocument();
  });
});
