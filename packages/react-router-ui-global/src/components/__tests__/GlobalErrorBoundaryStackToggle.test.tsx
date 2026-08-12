import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { RenderResult } from '@testing-library/react';
import { GlobalErrorBoundaryStackToggle } from '../GlobalErrorBoundaryStackToggle';
import type { GlobalErrorBoundaryStackToggleProps } from '../GlobalErrorBoundaryStackToggle';

describe('GlobalErrorBoundaryStackToggle Component', () => {
  let component: RenderResult;
  let props: GlobalErrorBoundaryStackToggleProps;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    props = { stack: 'Error: boom\n  at Foo (file.ts:1:1)' };

    const Component = () => <GlobalErrorBoundaryStackToggle {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders collapsed by default with a "Show stack trace" button and no stack content', () => {
    expect(
      component.getByTestId('GlobalErrorBoundaryStackToggle'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Show stack trace' }),
    ).toBeInTheDocument();
    expect(component.queryByText('Stack trace')).not.toBeInTheDocument();
    expect(component.queryByText(/boom/)).not.toBeInTheDocument();
  });

  test('reveals the stack trace and flips the label when clicked', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', { name: 'Show stack trace' }),
    );

    expect(
      component.getByRole('heading', { name: 'Stack trace' }),
    ).toBeInTheDocument();
    expect(component.getByText(/boom/)).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Hide stack trace' }),
    ).toBeInTheDocument();
  });

  test('hides the stack trace again on a second click', async () => {
    const user = userEvent.setup();
    const toggle = component.getByRole('button', {
      name: 'Show stack trace',
    });

    await user.click(toggle);
    await user.click(
      component.getByRole('button', { name: 'Hide stack trace' }),
    );

    expect(
      component.getByRole('button', { name: 'Show stack trace' }),
    ).toBeInTheDocument();
    expect(component.queryByText('Stack trace')).not.toBeInTheDocument();
  });

  test('renders an empty code block when no stack is provided', async () => {
    cleanup();
    props = {};
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <GlobalErrorBoundaryStackToggle {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);

    const user = userEvent.setup();
    await user.click(
      component.getByRole('button', { name: 'Show stack trace' }),
    );

    expect(
      component.getByRole('heading', { name: 'Stack trace' }),
    ).toBeInTheDocument();
  });
});
