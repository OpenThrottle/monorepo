import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, Link } from 'react-router';
import { describe, expect, test } from 'vitest';

import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

const Probe = (props: { readonly isDirty: boolean }): React.ReactElement => {
  const blocker = useUnsavedChangesGuard(props.isDirty);

  return (
    <>
      <p>blocker: {blocker.state}</p>
      <Link to="/elsewhere">Leave</Link>
    </>
  );
};

const renderProbe = (isDirty: boolean) => {
  const Stub = createRoutesStub([
    // eslint-disable-next-line react/no-multi-comp
    { Component: () => <Probe isDirty={isDirty} />, path: '/' },
    // eslint-disable-next-line react/no-multi-comp
    { Component: () => <p>elsewhere</p>, path: '/elsewhere' },
  ]);

  return render(<Stub />);
};

describe('useUnsavedChangesGuard', () => {
  test('blocks leaving while dirty', async () => {
    const component = renderProbe(true);

    await userEvent
      .setup()
      .click(component.getByRole('link', { name: 'Leave' }));

    expect(component.getByText('blocker: blocked')).toBeInTheDocument();
    expect(component.queryByText('elsewhere')).not.toBeInTheDocument();
  });

  test('lets a clean editor leave', async () => {
    const component = renderProbe(false);

    await userEvent
      .setup()
      .click(component.getByRole('link', { name: 'Leave' }));

    expect(await component.findByText('elsewhere')).toBeInTheDocument();
  });
});
