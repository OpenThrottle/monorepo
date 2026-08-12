import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { RolloutFlagCreateDialog } from './RolloutFlagCreateDialog';
import type { RolloutFlagCreateDialogProps } from './RolloutFlagCreateDialog';

describe('RolloutFlagCreateDialog Component', () => {
  let component: RenderResult;
  let props: RolloutFlagCreateDialogProps;

  const renderDialog = (): RenderResult => {
    const RoutesStub = createRoutesStub([
      {
        Component: () => <RolloutFlagCreateDialog {...props} />,
        action: async () => ({ ok: true }),
        path: '/',
      },
    ]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {};
    component = renderDialog();
  });

  test('renders the trigger button with the create-flag copy', () => {
    expect(
      component.getByRole('button', { name: ROLLOUT_COPY.createButton }),
    ).toBeInTheDocument();
  });

  test('opens the dialog with the create form when the trigger is clicked', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', { name: ROLLOUT_COPY.createButton }),
    );

    expect(
      component.getByRole('heading', { name: ROLLOUT_COPY.createTitle }),
    ).toBeInTheDocument();
    expect(
      component.getByText(ROLLOUT_COPY.createDescription),
    ).toBeInTheDocument();
  });

  test('renders the inline action error alert when actionError is provided', async () => {
    component.unmount();
    props = { actionError: 'Key already exists' };
    component = renderDialog();

    const user = userEvent.setup();
    await user.click(
      component.getByRole('button', { name: ROLLOUT_COPY.createButton }),
    );

    expect(component.getByRole('alert')).toHaveTextContent(
      'Key already exists',
    );
  });
});
