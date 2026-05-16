import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanToggleLayout } from '../PlanToggleLayout';
import type { PlanToggleLayoutProps } from '../PlanToggleLayout';

describe('PlanToggleLayout Component', () => {
  let onValueChange: ReturnType<typeof vi.fn<(value: string) => void>>;

  beforeEach(() => {
    onValueChange = vi.fn();
  });

  test('renders tasks heading and table/board toggle', () => {
    const props: PlanToggleLayoutProps = {
      onValueChange,
      value: 'table',
    };
    const Component = () => <PlanToggleLayout {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByRole } = render(<RoutesStub />);

    expect(
      getByRole('heading', { level: 2, name: 'Tasks' }),
    ).toBeInTheDocument();
    expect(
      getByRole('group', { name: 'Choose how to display plan tasks' }),
    ).toBeInTheDocument();
  });

  test('invokes onValueChange when board view is selected', async () => {
    const user = userEvent.setup();
    const props: PlanToggleLayoutProps = {
      onValueChange,
      value: 'table',
    };
    const Component = () => <PlanToggleLayout {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByRole } = render(<RoutesStub />);

    await user.click(getByRole('radio', { name: 'Board view' }));

    expect(onValueChange).toHaveBeenCalledWith('board');
  });
});
