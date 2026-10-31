import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { MISSING_WORKTREES_COPY } from '~/routing/settings/repositories/data/data.copy';

import type { PruneMissingWorktreesButtonProps } from '../PruneMissingWorktreesButton';
import { PruneMissingWorktreesButton } from '../PruneMissingWorktreesButton';

const renderButton = (
  props: PruneMissingWorktreesButtonProps,
  submitted: FormData[],
): RenderResult => {
  const Component = () => <PruneMissingWorktreesButton {...props} />;
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: async ({ request }) => {
        submitted.push(await request.formData());
        return null;
      },
      path: '/',
    },
  ]);

  return render(<RoutesStub />);
};

describe('PruneMissingWorktreesButton Component', () => {
  let submitted: FormData[];

  beforeEach(() => {
    submitted = [];
  });

  describe('when worktrees are missing', () => {
    let component: RenderResult;

    beforeEach(() => {
      component = renderButton(
        { checkoutIds: ['worktree-1', 'worktree-2'] },
        submitted,
      );
    });

    test('asks for confirmation before submitting anything', async () => {
      const user = userEvent.setup();

      await user.click(component.getByRole('button', { name: /2/ }));

      expect(await component.findByRole('alertdialog')).toBeInTheDocument();
      expect(submitted).toHaveLength(0);
    });

    test('confirming posts every id in one prune intent', async () => {
      const user = userEvent.setup();

      await user.click(component.getByRole('button', { name: /2/ }));
      await user.click(
        await component.findByRole('button', {
          name: MISSING_WORKTREES_COPY.pruneConfirm,
        }),
      );

      await waitFor(() => expect(submitted).toHaveLength(1));
      expect(submitted[0]?.get('intent')).toBe('pruneWorktreeCheckouts');
      expect(submitted[0]?.get('checkoutIds')).toBe('worktree-1,worktree-2');
    });

    test('cancelling submits nothing', async () => {
      const user = userEvent.setup();

      await user.click(component.getByRole('button', { name: /2/ }));
      await user.click(
        await component.findByRole('button', {
          name: MISSING_WORKTREES_COPY.pruneCancel,
        }),
      );

      expect(submitted).toHaveLength(0);
    });
  });

  describe('when nothing is missing', () => {
    test('renders nothing', () => {
      const component = renderButton({ checkoutIds: [] }, submitted);

      expect(component.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
