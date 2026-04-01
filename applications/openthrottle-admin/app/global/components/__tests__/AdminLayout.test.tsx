import * as React from 'react';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AdminLayout } from '../AdminLayout';

describe('AdminLayout Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = () => (
      <AdminLayout>
        <main data-testid="admin-main">Page content</main>
      </AdminLayout>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render header with sidebar trigger', () => {
    const header = component.getByTestId('AdminLayout-header');
    expect(header).toBeInTheDocument();
    const trigger = within(header).getByRole('button', {
      name: /toggle sidebar/i,
    });
    expect(trigger).toBeInTheDocument();
  });

  test('should render children in main area', () => {
    const main = component.getByTestId('admin-main');
    expect(main).toHaveTextContent('Page content');
  });

  describe('sidebar trigger', () => {
    test('should be clickable', async () => {
      const user = userEvent.setup();
      const header = component.getByTestId('AdminLayout-header');
      const trigger = within(header).getByRole('button', {
        name: /toggle sidebar/i,
      });
      await user.click(trigger);
      expect(trigger).toBeInTheDocument();
    });
  });
});
