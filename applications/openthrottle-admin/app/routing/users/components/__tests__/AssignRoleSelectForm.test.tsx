import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useFetcher } from 'react-router';
import { describe, expect, test } from 'vitest';
import { AssignRoleSelectForm } from '../AssignRoleSelectForm';
import type { AssignRoleSelectFormProps } from '../AssignRoleSelectForm';
import type { action as userDetailAction } from '~/routes/users.$userId';

const availableRoles: AssignRoleSelectFormProps['availableRoles'] = [
  { id: 'role-1', name: 'admin' },
  { id: 'role-2', name: 'editor' },
];

const renderForm = (): RenderResult => {
  const Harness = () => {
    const fetcher = useFetcher<typeof userDetailAction>();
    return (
      <AssignRoleSelectForm availableRoles={availableRoles} fetcher={fetcher} />
    );
  };

  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub />);
};

describe('AssignRoleSelectForm Component', () => {
  test('renders the assign-role placeholder and a disabled Assign button until a role is picked', () => {
    const component = renderForm();

    expect(component.getByText('Assign role…')).toBeInTheDocument();
    expect(component.getByRole('button', { name: 'Assign' })).toBeDisabled();
  });
});
