import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useFetcher } from 'react-router';
import { describe, expect, test } from 'vitest';
import { RoleDeleteDialog } from '../RoleDeleteDialog';
import type { action as roleDetailAction } from '~/routes/roles.$roleId';

const renderDialog = (): RenderResult => {
  const Harness = () => {
    const fetcher = useFetcher<typeof roleDetailAction>();
    return <RoleDeleteDialog fetcher={fetcher} />;
  };

  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub />);
};

describe('RoleDeleteDialog Component', () => {
  test('opens the confirmation dialog with the delete warning when triggered', async () => {
    const user = userEvent.setup();
    const component = renderDialog();

    await user.click(component.getByRole('button', { name: 'Delete role' }));

    expect(
      await component.findByRole('heading', { name: 'Delete role' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(/permanently delete this role/i),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument();
  });
});
