import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TRAJECTORY_LABEL_COPY } from '~/routing/evals/data/data.copy';
import { MOCK_MY_LABEL } from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/renderEvals';

import { TrajectoryLabelForm } from '../TrajectoryLabelForm';

const copy = TRAJECTORY_LABEL_COPY;

interface Deferred {
  readonly promise: Promise<unknown>;
  readonly resolve: (value: unknown) => void;
}

const defer = (): Deferred => {
  let resolve: (value: unknown) => void = () => {};
  const promise = new Promise<unknown>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

const renderForm = (
  current: typeof MOCK_MY_LABEL | null,
  respond: (form: FormData) => Promise<unknown> | unknown,
) => {
  return renderEvals(<TrajectoryLabelForm current={current} />, {
    action: async ({ request }) => {
      return respond(await request.formData());
    },
    initialEntry: undefined,
    path: undefined,
  });
};

describe('TrajectoryLabelForm Component', () => {
  describe('with no label yet', () => {
    test('keeps Save disabled until a verdict is chosen and offers no Remove', async () => {
      const user = userEvent.setup();
      const component = renderForm(null, () => ({ ok: true }));
      const save = component.getByRole('button', { name: copy.save });

      expect(save).toBeDisabled();
      expect(
        component.queryByRole('button', { name: copy.remove }),
      ).not.toBeInTheDocument();

      await user.click(component.getByRole('radio', { name: copy.pass }));

      expect(save).toBeEnabled();
    });

    test('submits the verdict, failure type and note, and shows pending', async () => {
      const user = userEvent.setup();
      const submitted: FormData[] = [];
      const pending = defer();
      const component = renderForm(null, (form) => {
        submitted.push(form);
        return pending.promise;
      });

      await user.click(component.getByRole('radio', { name: copy.fail }));
      await user.type(component.getByLabelText(copy.failureType), 'wrong-file');
      await user.type(component.getByLabelText(copy.note), 'Edited the route.');
      await user.click(component.getByRole('button', { name: copy.save }));

      expect(
        await component.findByRole('button', { name: copy.saving }),
      ).toBeDisabled();
      expect(submitted[0]?.get('intent')).toBe('label');
      expect(submitted[0]?.get('verdict')).toBe('fail');
      expect(submitted[0]?.get('failureType')).toBe('wrong-file');
      expect(submitted[0]?.get('note')).toBe('Edited the route.');

      pending.resolve({ ok: true });

      expect(
        await component.findByRole('button', { name: copy.save }),
      ).toBeEnabled();
    });

    test('shows the action error', async () => {
      const user = userEvent.setup();
      const component = renderForm(null, () => ({ error: 'Server said no.' }));

      await user.click(component.getByRole('radio', { name: copy.pass }));
      await user.click(component.getByRole('button', { name: copy.save }));

      expect(await component.findByRole('alert')).toHaveTextContent(
        'Server said no.',
      );
    });
  });

  describe('with your label', () => {
    test('seeds the fields from it', () => {
      const component = renderForm(MOCK_MY_LABEL, () => ({ ok: true }));

      expect(component.getByRole('radio', { name: copy.fail })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(component.getByLabelText(copy.failureType)).toHaveValue(
        MOCK_MY_LABEL.failureType,
      );
      expect(component.getByLabelText(copy.note)).toHaveValue(
        MOCK_MY_LABEL.note,
      );
    });

    test('removes it through the removeLabel intent', async () => {
      const user = userEvent.setup();
      const submitted: FormData[] = [];
      const component = renderForm(MOCK_MY_LABEL, (form) => {
        submitted.push(form);
        return { ok: true };
      });

      await user.click(component.getByRole('button', { name: copy.remove }));

      await waitFor(() => {
        expect(submitted[0]?.get('intent')).toBe('removeLabel');
      });
    });
  });
});
