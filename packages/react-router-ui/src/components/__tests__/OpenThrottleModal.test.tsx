import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleModal } from '../OpenThrottleModal';
import type { OpenThrottleModalProps } from '../OpenThrottleModal';

describe('OpenThrottleModal Component', () => {
  let component: RenderResult;
  let props: OpenThrottleModalProps;

  beforeEach(() => {
    props = { param: 'modal', value: 'open' };

    const Component = () => <OpenThrottleModal {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('does not show dialog when search param is not set', () => {
    expect(component.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows dialog with an accessible name when search param matches', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <OpenThrottleModal param="modal" title="Edit settings" value="open" />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    const result = render(<RoutesStub initialEntries={['/?modal=open']} />);

    // Querying by accessible name asserts the visually-hidden DialogTitle wires
    // up the dialog's accessible name for screen readers.
    expect(
      result.getByRole('dialog', { name: 'Edit settings' }),
    ).toBeInTheDocument();
  });

  test('closes the dialog when onOpenChange(false) fires (Esc)', async () => {
    const user = userEvent.setup();
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <OpenThrottleModal param="modal" title="Edit settings" value="open" />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    const result = render(<RoutesStub initialEntries={['/?modal=open']} />);

    expect(result.getByRole('dialog')).toBeInTheDocument();

    // Esc triggers Radix `onOpenChange(false)`, which must clear the search
    // param and unmount the dialog — regression guard for the dropped close path.
    await user.keyboard('{Escape}');

    expect(result.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
