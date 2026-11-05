import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_INBOX_COPY } from '~/routing/plans/data/data.copy';

import { PlanInboxComposer } from '../PlanInboxComposer';

const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: toastError, success: toastSuccess }),
}));

type Posted = Record<string, FormDataEntryValue>;

const renderComposer = (
  respond: (posted: Posted) => unknown,
): { component: RenderResult; posts: Posted[] } => {
  const posts: Posted[] = [];
  const Component = () => {
    return <PlanInboxComposer planId="p1" />;
  };
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: async ({ request }) => {
        const posted = Object.fromEntries(await request.formData());
        posts.push(posted);
        return respond(posted);
      },
      path: '/plans/:planId',
    },
  ]);

  const component = render(<RoutesStub initialEntries={['/plans/p1']} />);

  return { component, posts };
};

describe('PlanInboxComposer', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastSuccess.mockClear();
  });

  test('disables Send until the message has text', async () => {
    const user = userEvent.setup();
    const { component } = renderComposer(() => null);
    const send = component.getByRole('button', {
      name: PLAN_INBOX_COPY.sendLabel,
    });

    expect(send).toBeDisabled();
    await user.type(component.getByLabelText(PLAN_INBOX_COPY.bodyLabel), '   ');
    expect(send).toBeDisabled();
  });

  test('posts a STEER by default and clears the message once accepted', async () => {
    const user = userEvent.setup();
    const { component, posts } = renderComposer(() => ({
      postPlanMessage: { id: 'm1' },
    }));
    const body = component.getByLabelText(PLAN_INBOX_COPY.bodyLabel);

    await user.type(body, 'Use the existing Badge');
    await user.click(
      component.getByRole('button', { name: PLAN_INBOX_COPY.sendLabel }),
    );

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(PLAN_INBOX_COPY.sentToast);
    });
    expect(posts).toEqual([
      {
        body: 'Use the existing Badge',
        intent: 'postPlanMessage',
        kind: 'STEER',
      },
    ]);
    expect(body).toHaveValue('');
  });

  test('posts a QUEUE when Queue is selected', async () => {
    const user = userEvent.setup();
    const { component, posts } = renderComposer(() => ({
      postPlanMessage: { id: 'm1' },
    }));

    await user.click(
      component.getByRole('radio', { name: PLAN_INBOX_COPY.kindQueue }),
    );
    expect(
      component.getByText(PLAN_INBOX_COPY.kindHintQueue),
    ).toBeInTheDocument();
    await user.type(
      component.getByLabelText(PLAN_INBOX_COPY.bodyLabel),
      'Add a test',
    );
    await user.click(
      component.getByRole('button', { name: PLAN_INBOX_COPY.sendLabel }),
    );

    await waitFor(() => {
      expect(posts[0]?.kind).toBe('QUEUE');
    });
  });

  test('keeps the message and shows the error when the send fails', async () => {
    const user = userEvent.setup();
    const { component } = renderComposer(() => ({
      postPlanMessageError: 'Message is required.',
    }));
    const body = component.getByLabelText(PLAN_INBOX_COPY.bodyLabel);

    await user.type(body, 'Keep me');
    await user.click(
      component.getByRole('button', { name: PLAN_INBOX_COPY.sendLabel }),
    );

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Message is required.');
    });
    expect(body).toHaveValue('Keep me');
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
