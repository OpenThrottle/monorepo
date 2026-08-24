import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { GlobalPopoverAction } from '../GlobalPopover';
import { GlobalPopoverActionItem } from '../GlobalPopoverActionItem';

describe('GlobalPopoverActionItem Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('invokes onConfirmRequest for a confirm submit action', async () => {
    const onConfirmRequest = vi.fn();
    const user = userEvent.setup();
    const action: GlobalPopoverAction = {
      confirm: {
        description: 'Sure?',
        title: 'Confirm',
      },
      fields: { intent: 'delete' },
      id: 'delete',
      kind: 'submit',
      label: 'Remove',
    };

    const Component = (): React.ReactElement => (
      <DropdownMenu defaultOpen={true}>
        <DropdownMenuTrigger asChild={true}>
          <button type="button">Open</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <GlobalPopoverActionItem
            action={action}
            onConfirmRequest={onConfirmRequest}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    await user.click(component.getByRole('menuitem', { name: 'Remove' }));

    expect(onConfirmRequest).toHaveBeenCalledWith('delete');
  });
});
