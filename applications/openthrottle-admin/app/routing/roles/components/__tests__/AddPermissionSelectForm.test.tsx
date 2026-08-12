import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useFetcher } from 'react-router';
import { describe, expect, test } from 'vitest';
import { AddPermissionSelectForm } from '../AddPermissionSelectForm';
import type { AddPermissionSelectFormProps } from '../AddPermissionSelectForm';
import type { action as roleDetailAction } from '~/routes/roles.$roleId';

const availablePermissions: AddPermissionSelectFormProps['availablePermissions'] =
  [
    { id: 'p1', name: 'users:read' },
    { id: 'p2', name: 'users:write' },
  ];

const renderForm = (): RenderResult => {
  const Harness = () => {
    const fetcher = useFetcher<typeof roleDetailAction>();
    return (
      <AddPermissionSelectForm
        availablePermissions={availablePermissions}
        fetcher={fetcher}
      />
    );
  };

  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub />);
};

describe('AddPermissionSelectForm Component', () => {
  test('renders the add-permission placeholder and a disabled Add button until a permission is picked', () => {
    const component = renderForm();

    expect(component.getByText('Add permission…')).toBeInTheDocument();
    expect(component.getByRole('button', { name: 'Add' })).toBeDisabled();
  });
});
