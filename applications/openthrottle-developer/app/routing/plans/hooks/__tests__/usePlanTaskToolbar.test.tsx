import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { UsePlanTaskToolbarOptions } from '../usePlanTaskToolbar';
import { usePlanTaskToolbar } from '../usePlanTaskToolbar';

interface HarnessProps {
  readonly action: (args: {
    readonly request: Request;
  }) => Promise<Record<string, unknown>>;
  readonly taskStatus?: UsePlanTaskToolbarOptions['taskStatus'];
}

function Harness(props: { readonly taskStatus?: string }): React.ReactElement {
  const { fetcherSetStatus, isCompleted } = usePlanTaskToolbar({
    taskStatus: props.taskStatus,
  });

  return (
    <div>
      <span data-testid="is-completed">{isCompleted ? 'yes' : 'no'}</span>
      <span data-testid="state">{fetcherSetStatus.state}</span>
      <button
        onClick={() => {
          const formData = new FormData();
          formData.set('intent', 'setTaskStatus');
          void fetcherSetStatus.submit(formData, { method: 'post' });
        }}
        type="button"
      >
        Mark complete
      </button>
    </div>
  );
}

const renderToolbar = (props: HarnessProps): RenderResult => {
  const Stub = createRoutesStub([
    {
      // eslint-disable-next-line react/no-multi-comp
      Component: () => <Harness taskStatus={props.taskStatus} />,
      action: props.action,
      path: '/plans/:planId/tasks/:taskId',
    },
  ]);

  return render(<Stub initialEntries={['/plans/p1/tasks/t1']} />);
};

describe('usePlanTaskToolbar', () => {
  test('isCompleted reflects the current task status', () => {
    const component = renderToolbar({
      action: async () => ({}),
      taskStatus: 'COMPLETED',
    });

    expect(component.getByTestId('is-completed')).toHaveTextContent('yes');
  });

  test('isCompleted is false for a non-completed status', () => {
    const component = renderToolbar({
      action: async () => ({}),
      taskStatus: 'PENDING',
    });

    expect(component.getByTestId('is-completed')).toHaveTextContent('no');
  });

  test('submitting the fetcher reaches idle once the action resolves', async () => {
    const user = userEvent.setup();
    const component = renderToolbar({
      action: async () => ({ setTaskStatusError: null }),
      taskStatus: 'PENDING',
    });

    await user.click(component.getByRole('button', { name: 'Mark complete' }));

    await waitFor(() =>
      expect(component.getByTestId('state')).toHaveTextContent('idle'),
    );
  });

  test('surfaces an action error without throwing', async () => {
    const user = userEvent.setup();
    const component = renderToolbar({
      action: async () => ({ setTaskStatusError: 'boom' }),
      taskStatus: 'PENDING',
    });

    await user.click(component.getByRole('button', { name: 'Mark complete' }));

    await waitFor(() =>
      expect(component.getByTestId('state')).toHaveTextContent('idle'),
    );
  });
});
