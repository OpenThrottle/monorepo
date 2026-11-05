import { Dialog, DialogContent } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { PlanRunDialogFooterProps } from '../PlanRunDialogFooter';
import { PlanRunDialogFooter } from '../PlanRunDialogFooter';

describe('PlanRunDialogFooter Component', () => {
  let props: PlanRunDialogFooterProps;

  const renderFooter = (): RenderResult => {
    return render(
      <Dialog open={true}>
        <DialogContent>
          <PlanRunDialogFooter {...props} />
        </DialogContent>
      </Dialog>,
    );
  };

  beforeEach(() => {
    props = {
      blockedReason: null,
      errorMessage: undefined,
      isSubmitting: false,
      mode: 'run',
      onCancel: vi.fn(),
    };
  });

  test('offers Run now and Cancel with nothing in the way', async () => {
    const user = userEvent.setup();
    const component = renderFooter();

    expect(component.getByRole('button', { name: 'Run now' })).toBeEnabled();
    expect(component.queryByTestId('PlanRunDialog-blocked-reason')).toBeNull();
    expect(component.queryByTestId('PlanRunDialog-error')).toBeNull();

    await user.click(component.getByRole('button', { name: 'Cancel' }));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  test('names the reason and disables submit when blocked', () => {
    props = { ...props, blockedReason: 'No branch.' };
    const component = renderFooter();

    const submit = component.getByRole('button', { name: 'Run now' });

    expect(submit).toBeDisabled();
    expect(
      component.getByTestId('PlanRunDialog-blocked-reason'),
    ).toHaveTextContent('No branch.');
    expect(submit.getAttribute('aria-describedby')).toBe(
      component.getByTestId('PlanRunDialog-blocked-reason').id,
    );
  });

  test('labels the submit button for the Schedule mode and the busy state', () => {
    props = { ...props, isSubmitting: true, mode: 'schedule' };
    const component = renderFooter();

    expect(
      component.getByRole('button', { name: 'Scheduling…' }),
    ).toBeDisabled();
  });

  test('shows the action error inline', () => {
    props = { ...props, errorMessage: 'Queue unavailable.' };
    const component = renderFooter();

    expect(component.getByTestId('PlanRunDialog-error')).toHaveTextContent(
      'Queue unavailable.',
    );
  });
});
