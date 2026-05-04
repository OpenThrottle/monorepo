import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalCollapsible } from '../GlobalCollapsible';
import type { GlobalCollapsibleProps } from '../GlobalCollapsible';

describe('GlobalCollapsible Component', () => {
  let props: GlobalCollapsibleProps;

  beforeEach(() => {
    props = {
      children: <p>Collapsible body content</p>,
      title: 'Section title',
    };

    const Component = () => <GlobalCollapsible {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('should render title and panel body', () => {
    expect(screen.getByTestId('GlobalCollapsible')).toBeInTheDocument();
    expect(screen.getByText('Section title')).toBeInTheDocument();
    expect(screen.getByText('Collapsible body content')).toBeInTheDocument();
  });

  test('should toggle panel content when trigger is activated', async () => {
    const user = userEvent.setup();
    expect(screen.getByText('Collapsible body content')).toBeVisible();

    const trigger = within(screen.getByTestId('GlobalCollapsible')).getByRole(
      'button',
    );
    await user.click(trigger);

    expect(screen.getByText('Collapsible body content')).not.toBeVisible();

    await user.click(trigger);
    expect(screen.getByText('Collapsible body content')).toBeVisible();
  });
});
