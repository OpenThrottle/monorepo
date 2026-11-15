import type { RenderResult } from '@testing-library/react';
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { GlobalCollapsibleProps } from '../GlobalCollapsible';
import { GlobalCollapsible } from '../GlobalCollapsible';

describe('GlobalCollapsible Component', () => {
  let component: RenderResult;
  let props: GlobalCollapsibleProps;

  beforeEach(() => {
    props = {
      children: <p>Collapsible body content</p>,
      title: 'Section title',
    };

    const Component = () => {
      return <GlobalCollapsible {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render title and panel body', () => {
    expect(component.getByTestId('GlobalCollapsible')).toBeInTheDocument();
    expect(component.getByText('Section title')).toBeInTheDocument();
    expect(component.getByText('Collapsible body content')).toBeInTheDocument();
  });

  test('should toggle panel content when trigger is activated', async () => {
    const user = userEvent.setup();
    expect(component.getByText('Collapsible body content')).toBeVisible();

    const trigger = within(
      component.getByTestId('GlobalCollapsible'),
    ).getByRole('button');
    await user.click(trigger);

    await waitFor(() => {
      expect(
        component.queryByText('Collapsible body content'),
      ).not.toBeInTheDocument();
    });

    await user.click(trigger);
    await waitFor(() => {
      expect(component.getByText('Collapsible body content')).toBeVisible();
    });
  });
});
