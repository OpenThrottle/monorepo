import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { ScheduleRepositoryField } from '../ScheduleRepositoryField';
import type { ScheduleRepositoryFieldProps } from '../ScheduleRepositoryField';

const SettingsStub = (): React.ReactElement => <p>Repository settings</p>;

const renderField = (
  fieldProps: ScheduleRepositoryFieldProps,
): RenderResult => {
  // Rendered inside a form, as ScheduleForm does: Radix only bubbles a hidden native
  // select (the thing that puts the value into FormData) when it is inside one.
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => (
    <form>
      <ScheduleRepositoryField {...fieldProps} />
    </form>
  );
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    { Component: SettingsStub, path: '/settings/repositories' },
  ]);

  return render(<RoutesStub />);
};

const repositories = [
  {
    displayName: 'monorepo',
    filesystemPath: '/Users/matt/Development/openthrottle',
    id: 'checkout-1',
  },
  {
    displayName: 'worktree',
    filesystemPath: '/Users/matt/Development/openthrottle-worktrees/wt',
    id: 'checkout-2',
  },
];

describe('ScheduleRepositoryField Component', () => {
  let component: RenderResult;
  let props: ScheduleRepositoryFieldProps;

  beforeEach(() => {
    props = { cwd: null, repositories, repositoryCheckoutId: null };
  });

  test('defaults to the workspace-root option when no checkout is targeted', () => {
    component = renderField(props);

    expect(
      component.getByRole('combobox', { name: SCHEDULE_COPY.repositoryLabel }),
    ).toHaveTextContent(SCHEDULE_COPY.repositoryNoneOption);
  });

  test('shows the targeted checkout name when one is set', () => {
    component = renderField({ ...props, repositoryCheckoutId: 'checkout-2' });

    expect(
      component.getByRole('combobox', { name: SCHEDULE_COPY.repositoryLabel }),
    ).toHaveTextContent('worktree');
  });

  test('lists every passed repository with its filesystem path', async () => {
    const user = userEvent.setup();
    component = renderField(props);

    await user.click(
      component.getByRole('combobox', { name: SCHEDULE_COPY.repositoryLabel }),
    );

    expect(
      await component.findByRole('option', { name: /monorepo/ }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('option', { name: /worktree/ }),
    ).toBeInTheDocument();
    expect(
      component.getByText('/Users/matt/Development/openthrottle'),
    ).toBeInTheDocument();
  });

  test('selecting a repository posts its checkout id', async () => {
    const user = userEvent.setup();
    component = renderField(props);

    await user.click(
      component.getByRole('combobox', { name: SCHEDULE_COPY.repositoryLabel }),
    );
    await user.click(
      await component.findByRole('option', { name: /monorepo/ }),
    );

    // Radix bubbles the value through a hidden native select so FormData carries it.
    const hidden = component.baseElement.querySelector(
      'select[name="repositoryCheckoutId"]',
    );
    expect(hidden).toHaveValue('checkout-1');
  });

  test('renders the settings link instead of an empty dropdown when the user has no repositories', () => {
    component = renderField({ ...props, repositories: [] });

    expect(
      component.queryByRole('combobox', {
        name: SCHEDULE_COPY.repositoryLabel,
      }),
    ).not.toBeInTheDocument();
    expect(
      component.getByText(SCHEDULE_COPY.repositoryEmptyState),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', {
        name: SCHEDULE_COPY.repositoryEmptyStateAction,
      }),
    ).toHaveAttribute('href', '/settings/repositories');
  });

  test('round-trips a legacy cwd in the advanced field, opened so it is not hidden', () => {
    component = renderField({ ...props, cwd: '/legacy/path' });

    expect(component.getByLabelText(SCHEDULE_COPY.cwdLabel)).toHaveValue(
      '/legacy/path',
    );
    expect(
      component
        .getByText(SCHEDULE_COPY.repositoryAdvancedSummary)
        .closest('details'),
    ).toHaveAttribute('open');
  });

  test('keeps the advanced field collapsed when there is no legacy cwd', () => {
    component = renderField(props);

    expect(
      component
        .getByText(SCHEDULE_COPY.repositoryAdvancedSummary)
        .closest('details'),
    ).not.toHaveAttribute('open');
  });
});
